import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfluxDB, Point, QueryApi } from '@influxdata/influxdb-client';

@Injectable()
export class InfluxService implements OnModuleInit {
  private readonly logger = new Logger(InfluxService.name);
  private influxDB: InfluxDB;
  private queryApi: QueryApi;
  private org: string;
  private bucket: string;
  private measurement: string;
  private isConnected = false;
  private lastConnectionTest = new Date();

  constructor(private configService: ConfigService) {
    this.initializeInfluxDB();
  }

  private initializeInfluxDB() {
    const url = this.configService.get<string>('INFLUX_URL');
    const token = this.configService.get<string>('INFLUX_TOKEN');
    const org = this.configService.get<string>('INFLUX_ORG');
    const bucket = this.configService.get<string>('INFLUX_BUCKET');
    const measurement = this.configService.get<string>('INFLUX_MEASUREMENT', 'telemetry');

    if (!url || !token || !org || !bucket) {
      const missing = [];
      if (!url) missing.push('INFLUX_URL');
      if (!token) missing.push('INFLUX_TOKEN');
      if (!org) missing.push('INFLUX_ORG');
      if (!bucket) missing.push('INFLUX_BUCKET');
      
      throw new Error(`InfluxDB configuration is incomplete. Missing: ${missing.join(', ')}`);
    }

    this.org = org;
    this.bucket = bucket;
    this.measurement = measurement;

    try {
      this.influxDB = new InfluxDB({ 
        url, 
        token,
        timeout: 90000,
      });
      this.queryApi = this.influxDB.getQueryApi(this.org);
      
      this.logger.log('InfluxDB service initialized successfully');
      this.logger.debug(`Configuration: URL=${url}, ORG=${org}, BUCKET=${bucket}, MEASUREMENT=${measurement}`);
    } catch (error) {
      this.logger.error('Failed to initialize InfluxDB:', error);
      throw new Error(`Failed to initialize InfluxDB: ${error.message}`);
    }
  }

  async onModuleInit() {
    setTimeout(async () => {
      const isConnected = await this.testConnection();
      if (!isConnected) {
        this.logger.warn('Initial InfluxDB connection test failed - will retry on first query');
      } else {
        this.isConnected = true;
        this.logger.log('InfluxDB connection verified on startup');
      }
    }, 2000);
  }

  async executeQuery(fluxQuery: string): Promise<any[]> {
    if (!this.queryApi) {
      throw new Error('InfluxDB query API is not initialized');
    }

    const result = [];
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount <= maxRetries) {
      try {
        this.logger.debug(`Executing query (attempt ${retryCount + 1}): ${fluxQuery.substring(0, 200)}...`);
        
        const queryStartTime = Date.now();
        
        for await (const { values, tableMeta } of this.queryApi.iterateRows(fluxQuery)) {
          const row = tableMeta.toObject(values);
          result.push(row);
          //safe
          if (result.length > 150000) {
            this.logger.warn(`Query returned more than 150,000 rows, truncating results`);
            break;
          }
        }

        const executionTime = Date.now() - queryStartTime;
        this.logger.debug(`Query executed successfully in ${executionTime}ms, returned ${result.length} rows`);
   
        if (!this.isConnected) {
          this.isConnected = true;
          this.logger.log('InfluxDB connection restored');
        }
        this.lastConnectionTest = new Date();

        return result;

      } catch (error) {
        const executionTime = Date.now() - startTime;
        this.logger.error(`InfluxDB query failed after ${executionTime}ms (attempt ${retryCount + 1}):`, error.message);
        
        this.isConnected = false;

        if (error.message.includes('timeout')) {
          if (retryCount < maxRetries) {
            this.logger.warn(`Query timeout, retrying... (${retryCount + 1}/${maxRetries})`);
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            continue;
          } else {
            throw new Error('InfluxDB query timeout - попробуйте уменьшить временной диапазон или использовать агрегацию');
          }
        } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
          throw new Error('InfluxDB authentication failed - проверьте токен доступа');
        } else if (error.message.includes('not found') || error.message.includes('404')) {
          throw new Error('InfluxDB bucket или organization не найдены');
        } else if (error.message.includes('connection') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
          if (retryCount < maxRetries) {
            this.logger.warn(`Connection error, retrying... (${retryCount + 1}/${maxRetries})`);
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            continue;
          } else {
            throw new Error('InfluxDB connection failed - проверьте URL и сетевое соединение');
          }
        } else if (error.message.includes('invalid query') || error.message.includes('syntax error')) {
          throw new Error(`InfluxDB query syntax error: ${error.message}`);
        }
        
        throw new Error(`InfluxDB query failed: ${error.message}`);
      }
    }

    throw new Error('InfluxDB query failed after all retry attempts');
  }

  async testConnection(): Promise<boolean> {
    try {
      const testQuery = `
        from(bucket: "${this.bucket}")
          |> range(start: -72h)
          |> filter(fn: (r) => r["_measurement"] == "${this.measurement}")
          |> limit(n: 1)
      `;
      
      let rowCount = 0;
      const startTime = Date.now();
      
      for await (const _ of this.queryApi.iterateRows(testQuery)) {
        rowCount++;
        break;
      }
      
      const testTime = Date.now() - startTime;
      this.logger.debug(`InfluxDB connection test successful in ${testTime}ms (${rowCount} rows)`);
      this.isConnected = true;
      this.lastConnectionTest = new Date();
      return true;
    } catch (error) {
      this.logger.error('InfluxDB connection test failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async getConnectionStatus(): Promise<{
    connected: boolean;
    lastTestTime: string;
    config: {
      bucket: string;
      org: string;
      measurement: string;
      url: string;
    };
  }> {
    const timeSinceLastTest = Date.now() - this.lastConnectionTest.getTime();
    let currentStatus = this.isConnected;
    
    if (timeSinceLastTest > 120000) { //2 минуты
      currentStatus = await this.testConnection();
    }
    
    return {
      connected: currentStatus,
      lastTestTime: this.lastConnectionTest.toISOString(),
      config: {
        bucket: this.bucket,
        org: this.org,
        measurement: this.measurement,
        url: this.configService.get<string>('INFLUX_URL') || ''
      }
    };
  }

  getBucket(): string { return this.bucket; }
  getMeasurement(): string { return this.measurement; }
  getOrg(): string { return this.org; }
  isConnectionHealthy(): boolean { return this.isConnected; }
}

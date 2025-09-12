import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InfluxService } from '../influx/influx.service';
import { TelemetryResponse, TimeValue, TrackPoint, FuelSensorData } from './telemetry.dto';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(private readonly influxService: InfluxService) {}

  async getImeis(): Promise<string[]> {
    const fluxQuery = `
      from(bucket: "${this.influxService.getBucket()}")
        |> range(start: -90d)
        |> filter(fn: (r) => r["_measurement"] == "${this.influxService.getMeasurement()}")
        |> keep(columns: ["imei"])
        |> group()
        |> distinct(column: "imei")
        |> sort(columns: ["imei"])
        |> limit(n: 500)
    `;

    try {
      this.logger.debug('Fetching IMEIs...');
      const result = await this.influxService.executeQuery(fluxQuery);
      
      this.logger.debug(`Raw IMEI query result length: ${result.length}`);
      
      const imeis = result
        .map(row => row.imei || row._value)
        .filter(imei => imei && typeof imei === 'string' && imei.trim() !== '' && imei.length > 5)
        .map(imei => imei.toString().trim());
      
      const uniqueImeis = [...new Set(imeis)].sort();
      
      this.logger.log(`Found ${uniqueImeis.length} unique IMEIs`);
      
      if (uniqueImeis.length === 0) {
        return await this.getImeisAlternative();
      }
      
      return uniqueImeis;
    } catch (error) {
      this.logger.error('Error fetching IMEIs:', error.message);
      throw new InternalServerErrorException(`Failed to fetch IMEIs: ${error.message}`);
    }
  }

  private async getImeisAlternative(): Promise<string[]> {
    const fluxQuery = `
      from(bucket: "${this.influxService.getBucket()}")
        |> range(start: -30d)
        |> filter(fn: (r) => r._measurement == "${this.influxService.getMeasurement()}")
        |> group(columns: ["imei"])
        |> first()
        |> keep(columns: ["imei"])
    `;

    try {
      this.logger.debug('Trying alternative IMEI query');
      const result = await this.influxService.executeQuery(fluxQuery);
      
      const imeis = result
        .map(row => row.imei)
        .filter(imei => imei && typeof imei === 'string' && imei.trim() !== '')
        .map(imei => imei.toString().trim());

      const uniqueImeis = [...new Set(imeis)].sort();
      this.logger.log(`Alternative query found ${uniqueImeis.length} IMEIs`);
      
      return uniqueImeis;
    } catch (error) {
      this.logger.error('Alternative IMEI query also failed:', error.message);
      return [];
    }
  }

  async getFields(imei: string): Promise<string[]> {
    if (!imei || typeof imei !== 'string') {
      throw new BadRequestException('IMEI is required and must be a string');
    }

    const fluxQuery = `
      from(bucket: "${this.influxService.getBucket()}")
        |> range(start: -90d)
        |> filter(fn: (r) => r["_measurement"] == "${this.influxService.getMeasurement()}")
        |> filter(fn: (r) => r["imei"] == "${imei}")
        |> keep(columns: ["_field"])
        |> group()
        |> distinct(column: "_field")
        |> sort(columns: ["_field"])
        |> limit(n: 200)
    `;

    try {
      this.logger.debug(`Querying fields for IMEI: ${imei}`);
      const result = await this.influxService.executeQuery(fluxQuery);
      
      this.logger.debug(`Raw fields result: ${JSON.stringify(result.slice(0, 3))}`);
      
      const fields = result
        .map(row => row._field || row._value)
        .filter(field => field && typeof field === 'string' && field.trim() !== '')
        .map(field => field.toString().trim());
      
      const uniqueFields = [...new Set(fields)].sort();
      
      this.logger.log(`Found ${uniqueFields.length} fields for IMEI ${imei}: ${uniqueFields.join(', ')}`);
      return uniqueFields;
    } catch (error) {
      this.logger.error(`Error fetching fields for IMEI ${imei}:`, error);
      throw new InternalServerErrorException(`Failed to fetch fields: ${error.message}`);
    }
  }

  async getAvailableFuelSensors(imei: string): Promise<string[]> {
    if (!imei) {
      throw new BadRequestException('IMEI is required');
    }
    const fluxQuery = `
      from(bucket: "${this.influxService.getBucket()}")
        |> range(start: -90d)
        |> filter(fn: (r) => r["_measurement"] == "${this.influxService.getMeasurement()}")
        |> filter(fn: (r) => r["imei"] == "${imei}")
        |> filter(fn: (r) => r["_field"] =~ /^fls485_level_[1-4]$/)
        |> keep(columns: ["_field"])
        |> group()
        |> distinct(column: "_field")
        |> sort(columns: ["_field"])
    `;

    try {
      this.logger.debug(`Searching fuel sensors for IMEI: ${imei}`);
      const result = await this.influxService.executeQuery(fluxQuery);
      
      this.logger.debug(`Fuel sensors raw result: ${JSON.stringify(result)}`);
      
      const sensors = result
        .map(row => row._field || row._value)
        .filter(field => field && typeof field === 'string' && field.includes('fls485_level_'))
        .map(field => field.toString().trim());
      
      const uniqueSensors = [...new Set(sensors)].sort();
      
      this.logger.log(`Found ${uniqueSensors.length} fuel sensors for IMEI ${imei}: ${uniqueSensors.join(', ')}`);
      
      if (uniqueSensors.length === 0) {
        this.logger.warn(`No fuel sensors found for IMEI ${imei}, checking if IMEI has any data...`);
        const allFields = await this.getFields(imei);
        const fuelFields = allFields.filter(field => field.includes('fls485_level_'));
        this.logger.log(`Alternative search found fuel fields: ${fuelFields.join(', ')}`);
        return fuelFields;
      }
      
      return uniqueSensors;
    } catch (error) {
      this.logger.error(`Error fetching fuel sensors for IMEI ${imei}:`, error);
      return [];
    }
  }

  async checkDataAvailability(imei: string, start: string, end: string): Promise<{
    hasData: boolean;
    dataRange?: { start: string; end: string };
    availableFields: string[];
    estimatedPoints: number;
  }> {
    const imeiCheckQuery = `
      from(bucket: "${this.influxService.getBucket()}")
        |> range(start: -90d)
        |> filter(fn: (r) => r["_measurement"] == "${this.influxService.getMeasurement()}")
        |> filter(fn: (r) => r["imei"] == "${imei}")
        |> limit(n: 1)
    `;

    try {
      const imeiCheck = await this.influxService.executeQuery(imeiCheckQuery);
      if (imeiCheck.length === 0) {
        this.logger.warn(`IMEI ${imei} not found in database`);
        return { hasData: false, availableFields: [], estimatedPoints: 0 };
      }

      const fluxQuery = `
        from(bucket: "${this.influxService.getBucket()}")
          |> range(start: time(v: "${start}"), stop: time(v: "${end}"))
          |> filter(fn: (r) => r["_measurement"] == "${this.influxService.getMeasurement()}")
          |> filter(fn: (r) => r["imei"] == "${imei}")
          |> keep(columns: ["_time", "_field"])
          |> limit(n: 5000)
          |> sort(columns: ["_time"])
      `;

      const result = await this.influxService.executeQuery(fluxQuery);
      
      if (result.length === 0) {
        return { hasData: false, availableFields: [], estimatedPoints: 0 };
      }

      const times = result.map(r => new Date(r._time)).sort((a, b) => a.getTime() - b.getTime());
      const fields = [...new Set(result.map(r => r._field))];

      const timeSpan = times[times.length - 1].getTime() - times[0].getTime();
      const avgInterval = timeSpan / times.length;
      const estimatedTotalPoints = Math.floor(timeSpan / avgInterval) * fields.length;

      return {
        hasData: true,
        dataRange: {
          start: times[0].toISOString(),
          end: times[times.length - 1].toISOString()
        },
        availableFields: fields,
        estimatedPoints: Math.min(estimatedTotalPoints, 75000)
      };
    } catch (error) {
      this.logger.error(`Error checking data availability for IMEI ${imei}:`, error);
      return { hasData: false, availableFields: [], estimatedPoints: 0 };
    }
  }
  //агрегация
  private calculateAggregationWindow(startDate: Date, endDate: Date): { window: string; isAggregated: boolean } {
    const timeRange = endDate.getTime() - startDate.getTime();
    const hours = timeRange / (1000 * 60 * 60);
    
    this.logger.debug(`Time range: ${hours.toFixed(2)} hours`);
    
    if (hours > 168) {
      this.logger.debug('Using 1h aggregation for > 7 days');
      return { 
        window: '|> aggregateWindow(every: 1h, fn: mean, createEmpty: false)', 
        isAggregated: true 
      };
    } else if (hours > 24) {
      this.logger.debug('Using 15m aggregation for > 1 day');
      return { 
        window: '|> aggregateWindow(every: 15m, fn: mean, createEmpty: false)', 
        isAggregated: true 
      };
    } else if (hours > 6) {
      this.logger.debug('Using 3m aggregation for > 6 hours');
      return { 
        window: '|> aggregateWindow(every: 3m, fn: mean, createEmpty: false)', 
        isAggregated: true 
      };
    }
    
    this.logger.debug('Using raw data for <= 6 hours');
    return { window: '', isAggregated: false };
  }

  async getTelemetryData(imei: string, start: string, end: string): Promise<TelemetryResponse> {
    if (!imei || !start || !end) {
      throw new BadRequestException('IMEI, start, and end dates are required');
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO 8601 format.');
    }

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const timeDiffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (timeDiffDays > 60) {
      throw new BadRequestException('Maximum time range is 60 days. Please use a smaller range.');
    }

    const dataCheck = await this.checkDataAvailability(imei, start, end);
    if (!dataCheck.hasData) {
      this.logger.warn(`No data found for IMEI ${imei} in specified time range`);
      return this.createEmptyResponse(start, end, []);
    }

    if (dataCheck.estimatedPoints > 50000) {
      this.logger.warn(`Large data set estimated: ${dataCheck.estimatedPoints} points for IMEI ${imei}`);
    }

    const availableFuelSensors = await this.getAvailableFuelSensors(imei);
    const aggregationConfig = this.calculateAggregationWindow(startDate, endDate);
    
    const baseFields = ['speed', 'latitude', 'longitude', 'main_power_voltage'];
    const allFields = [...baseFields, ...availableFuelSensors];

    const fieldsFilter = allFields.map(f => `r["_field"] == "${f}"`).join(' or ');
    
    const fluxQuery = `
      from(bucket: "${this.influxService.getBucket()}")
        |> range(start: time(v: "${start}"), stop: time(v: "${end}"))
        |> filter(fn: (r) => r["_measurement"] == "${this.influxService.getMeasurement()}")
        |> filter(fn: (r) => r["imei"] == "${imei}")
        |> filter(fn: (r) => ${fieldsFilter})
        ${aggregationConfig.window}
        |> keep(columns: ["_time", "_field", "_value"])
        |> sort(columns: ["_time"])
        |> limit(n: 80000)
    `;

    try {
      this.logger.log(`Fetching telemetry data for IMEI ${imei} from ${start} to ${end}`);
      this.logger.debug(`Available fuel sensors: ${availableFuelSensors.join(', ')}`);
      this.logger.debug(`Using aggregation: ${aggregationConfig.window || 'none'}`);
      
      const result = await this.influxService.executeQuery(fluxQuery);
      
      if (result.length === 0) {
        this.logger.warn(`No data returned from query for IMEI ${imei}`);
        return this.createEmptyResponse(start, end, availableFuelSensors);
      }

      return this.processResultData(result, start, end, availableFuelSensors, aggregationConfig.isAggregated);

    } catch (error) {
      this.logger.error(`Error fetching telemetry data for IMEI ${imei}:`, error);
      throw new InternalServerErrorException(`Failed to fetch telemetry data: ${error.message}`);
    }
  }

  private createEmptyResponse(start: string, end: string, availableSensors: string[]): TelemetryResponse {
    return {
      series: { speed: [], main_power_voltage: [] },
      fuelSensors: {},
      track: [],
      dataInfo: {
        totalPoints: 0,
        timeRange: { start, end },
        availableSensors,
        aggregationUsed: false
      }
    };
  }

  private processResultData(
    result: any[], 
    start: string, 
    end: string, 
    availableFuelSensors: string[],
    aggregationUsed: boolean
  ): TelemetryResponse {
    const data: Record<string, TimeValue[]> = {};
    const coordinates: { time: string; lat?: number; lon?: number }[] = [];

    const baseFields = ['speed', 'main_power_voltage'];
    baseFields.forEach(field => {
      data[field] = [];
    });

    availableFuelSensors.forEach(sensor => {
      data[sensor] = [];
    });

    let processedPoints = 0;
    let skippedPoints = 0;

    result.forEach(record => {
      const time = new Date(record._time).toISOString();
      const field = record._field;
      let value = parseFloat(record._value);

      if (isNaN(value)) {
        skippedPoints++;
        return;
      }


      if (field === 'main_power_voltage') {
        value = Math.round((value / 1000) * 100) / 100; //=>В
      } else if (field === 'speed') {
        value = Math.max(0, Math.round(value * 100) / 100); //отрицательная
      }

      if (field === 'latitude' || field === 'longitude') {
        //Фильтрация координат
        if (value === 0 || value < -180 || value > 180) {
          return;
        }

        if (field === 'latitude' && (value < -90 || value > 90)) {
          return;
        }

        const existingCoord = coordinates.find(c => c.time === time);
        if (existingCoord) {
          if (field === 'latitude') existingCoord.lat = value;
          else existingCoord.lon = value;
        } else {
          const newCoord: any = { time };
          if (field === 'latitude') newCoord.lat = value;
          else newCoord.lon = value;
          coordinates.push(newCoord);
        }
      } else if (data[field]) {
        data[field].push({ 
          time, 
          value: Math.round(value * 100) / 100 
        });
        processedPoints++;
      }
    });
    const track: TrackPoint[] = coordinates
      .filter(coord => 
        coord.lat !== undefined && coord.lon !== undefined && 
        coord.lat !== 0 && coord.lon !== 0 &&
        coord.lat >= -90 && coord.lat <= 90 &&
        coord.lon >= -180 && coord.lon <= 180
      )
      .map(coord => ({
        time: coord.time,
        lat: coord.lat!,
        lon: coord.lon!,
        event_time: Math.floor(new Date(coord.time).getTime() / 1000)
      }))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());


    const fuelSensors: Record<string, FuelSensorData> = {};
    availableFuelSensors.forEach(sensor => {
      const sensorNumber = sensor.replace('fls485_level_', '');
      if (data[sensor] && data[sensor].length > 0) {
        fuelSensors[`level_${sensorNumber}`] = {
          data: data[sensor],
          sensorId: sensorNumber,
          unit: 'units'
        };
      }
    });

    const totalPoints = Object.values(data).reduce((sum, arr) => sum + arr.length, 0) + track.length;

    this.logger.log(`Processed ${result.length} raw records into ${totalPoints} structured points`);
    this.logger.log(`Series: speed=${data.speed?.length || 0}, voltage=${data.main_power_voltage?.length || 0}`);
    this.logger.log(`Fuel sensors: ${Object.keys(fuelSensors).map(k => `${k}=${fuelSensors[k].data.length}`).join(', ')}`);
    this.logger.log(`Track points: ${track.length}, Skipped points: ${skippedPoints}`);

    return {
      series: {
        speed: data.speed || [],
        main_power_voltage: data.main_power_voltage || []
      },
      fuelSensors,
      track,
      dataInfo: {
        totalPoints,
        timeRange: { start, end },
        availableSensors: availableFuelSensors,
        aggregationUsed
      }
    };
  }

  async getRecommendedTimeRange(imei: string): Promise<{
    start: string;
    end: string;
    dataPointsCount: number;
  } | null> {
    const fluxQuery = `
      from(bucket: "${this.influxService.getBucket()}")
        |> range(start: -30d)
        |> filter(fn: (r) => r["_measurement"] == "${this.influxService.getMeasurement()}")
        |> filter(fn: (r) => r["imei"] == "${imei}")
        |> keep(columns: ["_time"])
        |> sort(columns: ["_time"])
        |> limit(n: 15000)
    `;

    try {
      const result = await this.influxService.executeQuery(fluxQuery);
      
      if (result.length === 0) {
        this.logger.warn(`No recent data found for IMEI ${imei}`);
        return null;
      }

      const times = result.map(r => new Date(r._time));
      times.sort((a, b) => a.getTime() - b.getTime());

      const latestTime = times[times.length - 1];
      const twelveHoursAgo = new Date(latestTime.getTime() - 12 * 60 * 60 * 1000);

      const recentTimes = times.filter(t => t >= twelveHoursAgo);
      
      if (recentTimes.length === 0) {
        const dayAgo = new Date(latestTime.getTime() - 24 * 60 * 60 * 1000);
        const dayTimes = times.filter(t => t >= dayAgo);
        
        return {
          start: dayTimes.length > 0 ? dayTimes[0].toISOString() : times[Math.max(0, times.length - 1000)].toISOString(),
          end: latestTime.toISOString(),
          dataPointsCount: dayTimes.length || Math.min(1000, times.length)
        };
      }

      return {
        start: recentTimes[0].toISOString(),
        end: latestTime.toISOString(),
        dataPointsCount: recentTimes.length
      };

    } catch (error) {
      this.logger.error(`Error getting recommended time range for IMEI ${imei}:`, error);
      return null;
    }
  }
}

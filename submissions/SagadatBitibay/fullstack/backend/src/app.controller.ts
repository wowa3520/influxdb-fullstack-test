import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { InfluxService } from './influx/influx.service';
import { Public } from './auth/decorators/public.decorator';

@ApiTags('Health')
@Controller('')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly influxService: InfluxService
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get application info' })
  @ApiResponse({ status: 200, description: 'Application info' })
  getHello(): { 
    message: string; 
    version: string; 
    timestamp: string; 
  } {
    return {
      message: this.appService.getHello(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async getHealth(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    influxdb: any;
    memory: {
      used: number;
      total: number;
      usage: string;
    };
  }> {
    const influxStatus = await this.influxService.getConnectionStatus();
    const memUsage = process.memoryUsage();
    
    let overallStatus = 'OK';
    if (!influxStatus.connected) {
      overallStatus = 'ERROR';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      influxdb: influxStatus,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        usage: `${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`
      }
    };
  }

}

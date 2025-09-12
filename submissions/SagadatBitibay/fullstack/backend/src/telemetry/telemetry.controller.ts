import { Controller, Get, Query, ValidationPipe, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { 
  GetFieldsDto, 
  GetTelemetryDto, 
  GetFuelSensorsDto,
  CheckDataDto,
  TelemetryResponse, 
  DataAvailabilityResponse,
  RecommendedTimeRangeResponse
} from './telemetry.dto';

@ApiTags('Telemetry')
@Controller('api')
@ApiBearerAuth('JWT-auth')
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('imeis')
  @ApiOperation({ summary: 'Получить список IMEI' })
  @ApiResponse({ status: 200, description: 'Список IMEI' })
  @ApiResponse({ status: 404, description: 'IMEI не найдены' })
  async getImeis(): Promise<string[]> {
    try {
      const imeis = await this.telemetryService.getImeis();
      
      if (imeis.length === 0) {
        throw new HttpException('No IMEIs found', HttpStatus.NOT_FOUND);
      }
      
      return imeis;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('fields')
  @ApiOperation({ summary: 'Получить поля для IMEI' })
  @ApiQuery({ name: 'imei', description: 'IMEI идентификатор', type: 'string' })
  @ApiResponse({ status: 200, description: 'Список полей' })
  @ApiResponse({ status: 400, description: 'Неверный запрос' })
  @ApiResponse({ status: 404, description: 'Поля не найдены' })
  async getFields(
    @Query('imei', new ValidationPipe({ transform: true })) imei: string
  ): Promise<string[]> {
    try {
      if (!imei || imei.trim() === '') {
        throw new HttpException('IMEI parameter is required', HttpStatus.BAD_REQUEST);
      }

      const fields = await this.telemetryService.getFields(imei.trim());
      
      if (fields.length === 0) {
        throw new HttpException(`No fields found for IMEI ${imei}`, HttpStatus.NOT_FOUND);
      }
      
      return fields;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('fuel-sensors')
  @ApiOperation({ summary: 'Получить датчики топлива для IMEI' })
  @ApiQuery({ name: 'imei', description: 'IMEI идентификатор', type: 'string' })
  @ApiResponse({ status: 200, description: 'Список датчиков топлива' })
  @ApiResponse({ status: 400, description: 'Неверный запрос' })
  async getFuelSensors(
    @Query('imei', new ValidationPipe({ transform: true })) imei: string
  ): Promise<string[]> {
    try {
      if (!imei || imei.trim() === '') {
        throw new HttpException('IMEI parameter is required', HttpStatus.BAD_REQUEST);
      }

      const sensors = await this.telemetryService.getAvailableFuelSensors(imei.trim());
      return sensors;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('check-data')
  @ApiOperation({ summary: 'Проверить наличие данных' })
  @ApiQuery({ name: 'imei', description: 'IMEI идентификатор', type: 'string' })
  @ApiQuery({ name: 'start', description: 'Дата начала', type: 'string' })
  @ApiQuery({ name: 'end', description: 'Дата окончания', type: 'string' })
  @ApiResponse({ status: 200, description: 'Информация о наличии данных' })
  @ApiResponse({ status: 400, description: 'Неверный запрос' })
  async checkDataAvailability(
    @Query() query: CheckDataDto
  ): Promise<DataAvailabilityResponse> {
    try {
      if (!query.imei || !query.start || !query.end) {
        throw new HttpException('IMEI, start, and end parameters are required', HttpStatus.BAD_REQUEST);
      }

      const startDate = new Date(query.start);
      const endDate = new Date(query.end);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new HttpException('Invalid date format. Use ISO 8601 format.', HttpStatus.BAD_REQUEST);
      }

      if (startDate >= endDate) {
        throw new HttpException('Start date must be before end date', HttpStatus.BAD_REQUEST);
      }

      const result = await this.telemetryService.checkDataAvailability(query.imei, query.start, query.end);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('recommended-time-range')
  @ApiOperation({ summary: 'Получить рекомендуемый период времени' })
  @ApiQuery({ name: 'imei', description: 'IMEI идентификатор', type: 'string' })
  @ApiResponse({ status: 200, description: 'Период времени с данными' })
  @ApiResponse({ status: 400, description: 'Неверный запрос' })
  @ApiResponse({ status: 404, description: 'Данные не найдены' })
  async getRecommendedTimeRange(
    @Query('imei', new ValidationPipe({ transform: true })) imei: string
  ): Promise<RecommendedTimeRangeResponse> {
    try {
      if (!imei || imei.trim() === '') {
        throw new HttpException('IMEI parameter is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.telemetryService.getRecommendedTimeRange(imei.trim());
      
      if (!result) {
        throw new HttpException(`No data found for IMEI ${imei}`, HttpStatus.NOT_FOUND);
      }
      
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('telemetry')
  @ApiOperation({ summary: 'Получить телеметрические данные' })
  @ApiQuery({ name: 'imei', description: 'IMEI идентификатор', type: 'string' })
  @ApiQuery({ name: 'start', description: 'Дата начала', type: 'string' })
  @ApiQuery({ name: 'end', description: 'Дата окончания', type: 'string' })
  @ApiResponse({ status: 200, description: 'Телеметрические данные' })
  @ApiResponse({ status: 400, description: 'Неверный запрос' })
  @ApiResponse({ status: 404, description: 'Данные не найдены' })
  async getTelemetry(
    @Query() query: GetTelemetryDto
  ): Promise<TelemetryResponse> {
    try {
      if (!query.imei || !query.start || !query.end) {
        throw new HttpException('IMEI, start, and end parameters are required', HttpStatus.BAD_REQUEST);
      }

      const startDate = new Date(query.start);
      const endDate = new Date(query.end);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new HttpException('Invalid date format. Use ISO 8601 format.', HttpStatus.BAD_REQUEST);
      }

      if (startDate >= endDate) {
        throw new HttpException('Start date must be before end date', HttpStatus.BAD_REQUEST);
      }
      const result = await this.telemetryService.getTelemetryData(query.imei, query.start, query.end);
      
      const hasAnyData = result.series.speed.length > 0 || 
                         result.series.main_power_voltage.length > 0 || 
                         Object.keys(result.fuelSensors).some(key => result.fuelSensors[key].data.length > 0) ||
                         result.track.length > 0;

      if (!hasAnyData) {
        throw new HttpException(`No data found for IMEI ${query.imei}`, HttpStatus.NOT_FOUND);
      }

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
}

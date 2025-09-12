import { IsString, IsNotEmpty, IsISO8601, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetFieldsDto {
  @ApiProperty({ description: 'IMEI identifier', example: '866795038154462' })
  @IsString()
  @IsNotEmpty()
  imei: string;
}

export class GetTelemetryDto {
  @ApiProperty({ description: 'IMEI identifier', example: '866795038154462' })
  @IsString()
  @IsNotEmpty()
  imei: string;

  @ApiProperty({ description: 'Start date in ISO 8601 format', example: '2024-01-10T00:00:00Z' })
  @IsISO8601()
  @IsNotEmpty()
  start: string;

  @ApiProperty({ description: 'End date in ISO 8601 format', example: '2024-01-11T00:00:00Z' })
  @IsISO8601()
  @IsNotEmpty()
  end: string;
}

export class GetFuelSensorsDto {
  @ApiProperty({ description: 'IMEI identifier', example: '866795038154462' })
  @IsString()
  @IsNotEmpty()
  imei: string;
}

export class CheckDataDto {
  @ApiProperty({ description: 'IMEI identifier', example: '866795038154462' })
  @IsString()
  @IsNotEmpty()
  imei: string;

  @ApiProperty({ description: 'Start date in ISO 8601 format', example: '2024-01-10T00:00:00Z' })
  @IsISO8601()
  @IsNotEmpty()
  start: string;

  @ApiProperty({ description: 'End date in ISO 8601 format', example: '2024-01-11T00:00:00Z' })
  @IsISO8601()
  @IsNotEmpty()
  end: string;
}

export interface TimeValue {
  time: string;
  value: number;
}

export interface TrackPoint {
  time: string;
  lat: number;
  lon: number;
  event_time: number;
}

export interface FuelSensorData {
  data: TimeValue[];
  sensorId: string;
  unit: 'units' | 'liters';
}

export interface DataInfo {
  totalPoints: number;
  timeRange: {
    start: string;
    end: string;
  };
  availableSensors: string[];
  aggregationUsed: boolean;
}

export interface TelemetryResponse {
  series: {
    speed: TimeValue[];
    main_power_voltage: TimeValue[];
  };
  fuelSensors: Record<string, FuelSensorData>;
  track: TrackPoint[];
  dataInfo: DataInfo;
}

export interface DataAvailabilityResponse {
  hasData: boolean;
  dataRange?: {
    start: string;
    end: string;
  };
  availableFields: string[];
  estimatedPoints: number;
}

export interface RecommendedTimeRangeResponse {
  start: string;
  end: string;
  dataPointsCount: number;
}

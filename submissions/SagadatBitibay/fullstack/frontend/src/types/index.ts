export interface TelemetryPoint {
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
    data: TelemetryPoint[];
    sensorId: string;
    unit: string;
  }
  
  export interface TelemetryResponse {
    series: {
      speed?: TelemetryPoint[];
      fls485_level_2?: TelemetryPoint[];
      main_power_voltage?: TelemetryPoint[];
    };
    fuelSensors: Record<string, FuelSensorData>;
    track: TrackPoint[];
    dataInfo: {
      totalPoints: number;
      timeRange: {
        start: string;
        end: string;
      };
      availableSensors: string[];
      aggregationUsed: boolean;
    };
  }
  
  export interface DataAvailability {
    hasData: boolean;
    dataRange: {
      start: string;
      end: string;
    };
    availableFields: string[];
  }

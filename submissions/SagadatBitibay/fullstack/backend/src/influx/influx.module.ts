import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InfluxService } from './influx.service';

@Module({
  imports: [ConfigModule],
  providers: [InfluxService],
  exports: [InfluxService],
})
export class InfluxModule {}

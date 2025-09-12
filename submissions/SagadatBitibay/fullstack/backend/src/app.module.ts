import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InfluxModule } from './influx/influx.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '.env',
    }),
    UserModule,
    AuthModule,
    InfluxModule,
    TelemetryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

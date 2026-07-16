import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registros } from 'src/entities/Registros';
import { MonitoreoController } from './monitoreo.controller';
import { MonitoreoService } from './monitoreo.service';

@Module({
  imports: [TypeOrmModule.forFeature([Registros])],
  controllers: [MonitoreoController],
  providers: [MonitoreoService],
  exports: [MonitoreoService],
})
export class MonitoreoModule {}

import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { CapturaPeriodoService } from './services/captura-periodo.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, CapturaPeriodoService],
  exports: [DashboardService],
})
export class DashboardModule {}

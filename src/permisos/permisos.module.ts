import { Module } from '@nestjs/common';
import { PermisosService } from './permisos.service';
import { PermisosController } from './permisos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permisos } from 'src/entities/Permisos';
import { RolesPermisos } from 'src/entities/RolesPermisos';
import { BitacoraModule } from 'src/bitacora/bitacora.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permisos, RolesPermisos]),
    BitacoraModule,
  ],
  controllers: [PermisosController],
  providers: [PermisosService],
  exports: [PermisosService],
})
export class PermisosModule {}

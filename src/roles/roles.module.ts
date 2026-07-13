import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitacoraModule } from 'src/bitacora/bitacora.module';
import { PermisosModule } from 'src/permisos/permisos.module';
import { Roles } from 'src/entities/Roles';
import { RolesPermisos } from 'src/entities/RolesPermisos';
import { Permisos } from 'src/entities/Permisos';

@Module({
  imports: [
      TypeOrmModule.forFeature([Roles, RolesPermisos, Permisos]),
      BitacoraModule,
      PermisosModule,
    ],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}

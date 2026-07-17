import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CapturistaVisita } from 'src/entities/CapturistaVisita';
import { Catastro } from 'src/entities/Catastro';
import { ContactoRepresentante } from 'src/entities/ContactoRepresentante';
import { Contactos } from 'src/entities/Contactos';
import { Corresponsables } from 'src/entities/Corresponsables';
import { Fotos } from 'src/entities/Fotos';
import { FotosLicenciaConstruccion } from 'src/entities/FotosLicenciaConstruccion';
import { LicenciaConstruccion } from 'src/entities/LicenciaConstruccion';
import { Licencias } from 'src/entities/Licencias';
import { ProteccionCivil } from 'src/entities/ProteccionCivil';
import { Registros } from 'src/entities/Registros';
import { Sapac } from 'src/entities/Sapac';
import { Usuarios } from 'src/entities/Usuarios';
import { Grupos } from 'src/entities/Grupos';
import { MonitoreoController } from './monitoreo.controller';
import { MonitoreoService } from './monitoreo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Registros,
      CapturistaVisita,
      Usuarios,
      Grupos,
      Sapac,
      Catastro,
      Licencias,
      Contactos,
      ProteccionCivil,
      ContactoRepresentante,
      Fotos,
      LicenciaConstruccion,
      Corresponsables,
      FotosLicenciaConstruccion,
    ]),
  ],
  controllers: [MonitoreoController],
  providers: [MonitoreoService],
  exports: [MonitoreoService],
})
export class MonitoreoModule {}

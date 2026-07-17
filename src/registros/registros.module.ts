import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitacoraModule } from 'src/bitacora/bitacora.module';
import { MonitoreoModule } from 'src/monitoreo/monitoreo.module';
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
import { TipoFoto } from 'src/entities/TipoFoto';
import { Usuarios } from 'src/entities/Usuarios';
import { Grupos } from 'src/entities/Grupos';
import { LicenciaConstruccionStorageService } from './licencia-construccion-storage.service';
import { RegistrosController } from './registros.controller';
import { RegistrosService } from './registros.service';
import { SapacStorageService } from './sapac-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Registros,
      CapturistaVisita,
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
      TipoFoto,
      Usuarios,
      Grupos,
    ]),
    BitacoraModule,
    MonitoreoModule,
  ],
  controllers: [RegistrosController],
  providers: [
    RegistrosService,
    LicenciaConstruccionStorageService,
    SapacStorageService,
  ],
})
export class RegistrosModule {}

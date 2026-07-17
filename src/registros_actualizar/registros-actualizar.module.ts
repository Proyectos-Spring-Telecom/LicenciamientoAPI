import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { LicenciaConstruccionStorageService } from 'src/registros/licencia-construccion-storage.service';
import { SapacStorageService } from 'src/registros/sapac-storage.service';
import { RegistrosActualizarController } from './registros-actualizar.controller';
import { RegistrosActualizarService } from './registros-actualizar.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Registros,
      Sapac,
      Catastro,
      Licencias,
      Contactos,
      ProteccionCivil,
      ContactoRepresentante,
      LicenciaConstruccion,
      Corresponsables,
      FotosLicenciaConstruccion,
      Fotos,
      TipoFoto,
    ]),
  ],
  controllers: [RegistrosActualizarController],
  providers: [
    RegistrosActualizarService,
    LicenciaConstruccionStorageService,
    SapacStorageService,
  ],
})
export class RegistrosActualizarModule {}

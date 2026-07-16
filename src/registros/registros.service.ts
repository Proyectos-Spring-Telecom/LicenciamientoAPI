import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { BitacoraLoggerService } from 'src/bitacora/bitacora.service';
import {
  ApiCrudResponse,
  EstatusEnumBitcora,
} from 'src/common/ApiResponse';
import { EnumModulos } from 'src/common/estatus.enum';
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
import {
  CATASTRO_TIPO_FOTO,
  CatastroFotoKey,
} from './catastro.constants';
import { CreateCatastroDto } from './dto/create-catastro.dto';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { CreateContactoRepresentanteDto } from './dto/create-contacto-representante.dto';
import { CreateLicenciaDto } from './dto/create-licencia.dto';
import { CreateLicenciaConstruccionDto } from './dto/create-licencia-construccion.dto';
import { CreateProteccionCivilDto } from './dto/create-proteccion-civil.dto';
import { CreateRegistroDto } from './dto/create-registro.dto';
import { CreateSapacDto } from './dto/create-sapac.dto';
import {
  FIRMA_TIPO_FOTO,
  FirmaKey,
  LICENCIA_CONSTRUCCION_DOCUMENTO_TIPO_FOTO,
  LcDocumentoKey,
} from './licencia-construccion.constants';
import {
  hasContactoData,
  hasCorresponsableData,
  isEmptyFormDataValue,
} from './licencia-construccion.sanitize';
import {
  FirmaFiles,
  LcDocumentoFiles,
  LicenciaConstruccionStorageService,
} from './licencia-construccion-storage.service';
import {
  LICENCIAS_TIPO_FOTO,
  LicenciasFotoKey,
} from './licencias.constants';
import {
  CatastroFotoFiles,
  LicenciasFotoFiles,
  parseRegistroMultipart,
  ProteccionCivilFotoFiles,
} from './registro-form.parser';
import {
  PROTECCION_CIVIL_TIPO_FOTO,
  ProteccionCivilFotoKey,
} from './proteccion-civil.constants';
import { SAPAC_TIPO_FOTO, SapacFotoKey } from './sapac.constants';
import {
  RegistroPhotoInput,
  SapacFotoFiles,
  SapacStorageService,
} from './sapac-storage.service';

const ESTATUS_ALTA = 4;

export interface FotoLicenciaResultado {
  id: number;
  idTipoFoto: number;
  ruta: string;
}

export interface ContactoResultado {
  id: number;
  nombre: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  telefono: string | null;
  correo: string | null;
}

export interface CorresponsableResultado {
  id: number;
  nombreCompleto: string | null;
  noRegLicenciaConstruccion: string | null;
  cedulaProfesional: string | null;
}

export interface CreateRegistroResultData {
  id: number;
  nombre: string;
  idCapturistaVisita?: number | null;
  idSapac?: number | null;
  idCatastro?: number | null;
  idLicencia?: number | null;
  contacto?: ContactoResultado | null;
  idProteccionCivil?: number | null;
  contactoRepresentante?: ContactoResultado | null;
  fotos?: FotoLicenciaResultado[];
  idLicenciaConstruccion?: number | null;
  corresponsables?: CorresponsableResultado[];
  fotosLicenciaConstruccion?: FotoLicenciaResultado[];
}


@Injectable()
export class RegistrosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bitacoraLogger: BitacoraLoggerService,
    private readonly storageService: LicenciaConstruccionStorageService,
    private readonly sapacStorageService: SapacStorageService,
  ) { }

  async createFromMultipart(
    body: Record<string, unknown>,
    uploaded: Record<string, Express.Multer.File[] | undefined>,
    idUser: number,
    idGrupo: number | null,
  ): Promise<ApiCrudResponse> {
    if (idUser == null) {
      throw new UnauthorizedException(
        'No fue posible identificar al usuario autenticado.',
      );
    }
    if (idGrupo == null) {
      throw new BadRequestException(
        'El usuario autenticado no tiene un grupo asignado.',
      );
    }

    const parsed = await parseRegistroMultipart(body, uploaded);

    this.storageService.assertValidFirmaFiles(parsed.firmas);
    this.storageService.assertValidDocumentoFiles(parsed.documentosLc);
    this.sapacStorageService.assertValidFiles(parsed.fotosSapac);
    this.sapacStorageService.assertValidPhotoInputs(
      this.buildCatastroPhotoInputs(parsed.fotosCatastro),
    );
    this.sapacStorageService.assertValidPhotoInputs(
      this.buildLicenciasPhotoInputs(parsed.fotosLicencias),
    );
    this.sapacStorageService.assertValidPhotoInputs(
      this.buildProteccionCivilPhotoInputs(parsed.fotosProteccionCivil),
    );
    await this.assertTipoFotoCatalog(parsed.firmas);
    await this.assertDocumentoTipoFotoCatalog(parsed.documentosLc);
    await this.assertSapacTipoFotoCatalog(parsed.fotosSapac);
    await this.assertCatastroTipoFotoCatalog(parsed.fotosCatastro);
    await this.assertLicenciasTipoFotoCatalog(parsed.fotosLicencias);
    await this.assertProteccionCivilTipoFotoCatalog(
      parsed.fotosProteccionCivil,
    );

    return this.create(
      parsed.registro,
      parsed.licenciaConstruccion,
      parsed.sapac,
      parsed.catastro,
      parsed.licencia,
      parsed.contacto,
      parsed.proteccionCivil,
      parsed.contactoRepresentante,
      parsed.firmas,
      parsed.documentosLc,
      parsed.fotosSapac,
      parsed.fotosCatastro,
      parsed.fotosLicencias,
      parsed.fotosProteccionCivil,
      parsed.crearLicenciaConstruccion,
      parsed.crearSapac,
      parsed.crearCatastro,
      parsed.crearLicencia,
      parsed.crearProteccionCivil,
      idUser,
      idGrupo,
    );
  }

  async create(
    dto: CreateRegistroDto,
    licenciaConstruccionDto: CreateLicenciaConstruccionDto | undefined,
    sapacDto: CreateSapacDto | undefined,
    catastroDto: CreateCatastroDto | undefined,
    licenciaDto: CreateLicenciaDto | undefined,
    contactoDto: CreateContactoDto | undefined,
    proteccionCivilDto: CreateProteccionCivilDto | undefined,
    contactoRepresentanteDto: CreateContactoRepresentanteDto | undefined,
    firmas: FirmaFiles,
    documentosLc: LcDocumentoFiles,
    fotosSapac: SapacFotoFiles,
    fotosCatastro: CatastroFotoFiles,
    fotosLicencias: LicenciasFotoFiles,
    fotosProteccionCivil: ProteccionCivilFotoFiles,
    crearLicenciaConstruccion: boolean,
    crearSapac: boolean,
    crearCatastro: boolean,
    crearLicencia: boolean,
    crearProteccionCivil: boolean,
    idUser: number,
    idGrupo: number,
  ): Promise<ApiCrudResponse> {
    const licenciaCreatedFiles: string[] = [];
    const fotosRegistrosCreatedFiles: string[] = [];
    let committed = false;
    const hasFirmas = Object.keys(firmas).length > 0;
    const hasDocumentosLc = Object.values(documentosLc).some(
      (list) => (list?.length ?? 0) > 0,
    );
    const hasFotosSapac = Object.keys(fotosSapac).length > 0;
    const hasFotosCatastro = Object.keys(fotosCatastro).length > 0;
    const hasFotosLicencias = Object.keys(fotosLicencias).length > 0;
    const hasFotosProteccionCivil =
      Object.keys(fotosProteccionCivil).length > 0;
    const predioObraCero =
      crearSapac || crearCatastro || crearLicencia || crearProteccionCivil;

    if (predioObraCero && (hasFirmas || hasDocumentosLc)) {
      throw new BadRequestException(
        'No se pueden registrar archivos de LicenciaConstruccion cuando PredioObra es 0.',
      );
    }
    if (!crearSapac && hasFotosSapac) {
      throw new BadRequestException(
        'No se pueden registrar fotografías de SAPAC cuando PredioObra es 1.',
      );
    }
    if (!crearCatastro && hasFotosCatastro) {
      throw new BadRequestException(
        'No se pueden registrar fotografías de Catastro cuando PredioObra es 1.',
      );
    }
    if (!crearLicencia && hasFotosLicencias) {
      throw new BadRequestException(
        'No se pueden registrar fotografías de Licencias cuando PredioObra es 1.',
      );
    }
    if (!crearProteccionCivil && hasFotosProteccionCivil) {
      throw new BadRequestException(
        'No se pueden registrar fotografías de ProteccionCivil cuando PredioObra es 1.',
      );
    }

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const usuario = await manager.findOne(Usuarios, {
          where: { id: idUser, estatus: 1 },
          select: ['id', 'idGrupo'],
        });

        if (!usuario) {
          throw new UnauthorizedException('Usuario no autorizado');
        }
        if (usuario.idGrupo == null) {
          throw new BadRequestException(
            'El usuario autenticado no tiene un grupo asignado.',
          );
        }
        if (Number(usuario.idGrupo) !== Number(idGrupo)) {
          throw new UnauthorizedException(
            'El grupo del usuario cambió. Renueve su sesión.',
          );
        }

        if (crearSapac && sapacDto?.IdTipoServicio != null) {
          const tipoServicio = await manager.query(
            'SELECT Id FROM TipoServicio WHERE Id = ? LIMIT 1',
            [sapacDto.IdTipoServicio],
          );
          if (!Array.isArray(tipoServicio) || tipoServicio.length === 0) {
            throw new BadRequestException(
              `El TipoServicio ${sapacDto.IdTipoServicio} no existe.`,
            );
          }
        }

        const registro = await manager.save(
          Registros,
          manager.create(Registros, {
            registro: null,
            latitud: dto.Latitud,
            longitud: dto.Longitud,
            entidadFederativa: dto.EntidadFederativa ?? null,
            municipio: dto.Municipio ?? null,
            localidad: dto.Localidad ?? null,
            colonia: dto.Colonia ?? null,
            calle: dto.Calle ?? null,
            noInterior: dto.NoInterior ?? null,
            noExterior: dto.NoExterior ?? null,
            cp: dto.CP ?? null,
            tipoRegistro: dto.TipoRegistro,
            predioObra: dto.PredioObra,
            estatus: ESTATUS_ALTA,
          }),
        );

        const idRegistro = Number(registro.id);
        const data: CreateRegistroResultData = {
          id: idRegistro,
          nombre: '',
          idCapturistaVisita: null,
          idSapac: null,
          idCatastro: null,
          idLicencia: null,
          contacto: null,
          idProteccionCivil: null,
          contactoRepresentante: null,
          fotos: [],
          idLicenciaConstruccion: null,
          corresponsables: [],
          fotosLicenciaConstruccion: [],
        };

        const capturistaVisita = await manager.save(
          CapturistaVisita,
          manager.create(CapturistaVisita, {
            idRegistro,
            idCapturista: idUser,
            idSupervisor: null,
            idGrupo: Number(usuario.idGrupo),
            fechaHora: new Date(),
          }),
        );
        data.idCapturistaVisita = Number(capturistaVisita.id);

        if (crearSapac) {
          const sapac = sapacDto ?? {};
          const savedSapac = await manager.save(
            Sapac,
            manager.create(Sapac, {
              idRegistro,
              numeroCuenta: sapac.NumeroCuenta ?? null,
              nombre: sapac.Nombre ?? null,
              apellidoPaterno: sapac.ApellidoPaterno ?? null,
              apellidoMaterno: sapac.ApellidoMaterno ?? null,
              rfc: sapac.RFC ?? null,
              sector: sapac.Sector ?? null,
              ruta: sapac.Ruta ?? null,
              folio: sapac.Folio ?? null,
              idTipoServicio: sapac.IdTipoServicio ?? null,
              medidor: sapac.Medidor ?? null,
            }),
          );
          data.idSapac = Number(savedSapac.id);
        }

        if (crearCatastro) {
          const catastro = catastroDto ?? {};
          const savedCatastro = await manager.save(
            Catastro,
            manager.create(Catastro, {
              idRegistro,
              clave: catastro.Clave ?? null,
              m2: catastro.M2 ?? null,
              superficie: catastro.Superficie ?? null,
              usoSuelo: catastro.UsoSuelo ?? null,
            }),
          );
          data.idCatastro = Number(savedCatastro.id);
        }

        if (crearLicencia) {
          const licencia = licenciaDto ?? {};
          const savedLicencia = await manager.save(
            Licencias,
            manager.create(Licencias, {
              idRegistro,
              registro: licencia.Registro ?? null,
              nombreComercial: licencia.NombreComercial ?? null,
              giro: licencia.Giro ?? null,
              licenciaSuelo: licencia.LicenciaSuelo ?? null,
              nombrePropietario: licencia.NombrePropietario ?? null,
              apellidoPaternoPropietario:
                licencia.ApellidoPaternoPropietario ?? null,
              apellidoMaternoPropietario:
                licencia.ApellidoMaternoPropietario ?? null,
              tipoPersona: licencia.TipoPersona ?? null,
              rfc: licencia.RFC ?? null,
              fechaExpedicion: licencia.FechaExpedicion
                ? new Date(licencia.FechaExpedicion)
                : null,
              fechaRefrendo: licencia.FechaRefrendo
                ? new Date(licencia.FechaRefrendo)
                : null,
              estacionamiento: licencia.Estacionamiento ?? null,
              tipo: licencia.Tipo ?? null,
              fechaHora: licencia.FechaHora
                ? new Date(licencia.FechaHora)
                : null,
            }),
          );
          data.idLicencia = Number(savedLicencia.id);

          if (hasContactoData(contactoDto)) {
            const contacto = contactoDto ?? {};
            const savedContacto = await manager.save(
              Contactos,
              manager.create(Contactos, {
                idRegistro,
                nombre: contacto.Nombre ?? null,
                apellidoPaterno: contacto.ApellidoPaterno ?? null,
                apellidoMaterno: contacto.ApellidoMaterno ?? null,
                telefono: contacto.Telefono ?? null,
                correo: contacto.Correo ?? null,
              }),
            );
            data.contacto = {
              id: Number(savedContacto.id),
              nombre: savedContacto.nombre,
              apellidoPaterno: savedContacto.apellidoPaterno,
              apellidoMaterno: savedContacto.apellidoMaterno,
              telefono: savedContacto.telefono,
              correo: savedContacto.correo,
            };
          }
        }

        if (crearProteccionCivil) {
          const proteccionCivil = proteccionCivilDto ?? {};
          const savedProteccionCivil = await manager.save(
            ProteccionCivil,
            manager.create(ProteccionCivil, {
              idRegistro,
              esEmpresa: proteccionCivil.EsEmpresa ?? null,
              razonSocial: proteccionCivil.RazonSocial ?? null,
              rfc: proteccionCivil.RFC ?? null,
              nombre: proteccionCivil.Nombre ?? null,
              apellidoPaterno: proteccionCivil.ApellidoPaterno ?? null,
              apellidoMaterno: proteccionCivil.ApellidoMaterno ?? null,
              telefono: proteccionCivil.Telefono ?? null,
              registroAcreditacion:
                proteccionCivil.RegistroAcreditacion ?? null,
              tienePrograma: proteccionCivil.TienePrograma ?? null,
            }),
          );
          data.idProteccionCivil = Number(savedProteccionCivil.id);

          if (this.hasContactoRepresentanteData(contactoRepresentanteDto)) {
            const contactoRepresentante = contactoRepresentanteDto ?? {};
            const savedContactoRepresentante = await manager.save(
              ContactoRepresentante,
              manager.create(ContactoRepresentante, {
                idRegistro,
                nombre: contactoRepresentante.Nombre ?? null,
                apellidoPaterno:
                  contactoRepresentante.ApellidoPaterno ?? null,
                apellidoMaterno:
                  contactoRepresentante.ApellidoMaterno ?? null,
                telefono: contactoRepresentante.Telefono ?? null,
                correo: contactoRepresentante.Correo ?? null,
              }),
            );
            data.contactoRepresentante = {
              id: Number(savedContactoRepresentante.id),
              nombre: savedContactoRepresentante.nombre,
              apellidoPaterno: savedContactoRepresentante.apellidoPaterno,
              apellidoMaterno: savedContactoRepresentante.apellidoMaterno,
              telefono: savedContactoRepresentante.telefono,
              correo: savedContactoRepresentante.correo,
            };
          }
        }

        // Fotos SAPAC + Catastro + Licencias → misma tabla Fotos / mismo storage.
        if (crearSapac || crearCatastro || crearLicencia || crearProteccionCivil) {
          const photoInputs: RegistroPhotoInput[] = [
            ...this.buildSapacPhotoInputs(fotosSapac),
            ...this.buildCatastroPhotoInputs(fotosCatastro),
            ...this.buildLicenciasPhotoInputs(fotosLicencias),
            ...this.buildProteccionCivilPhotoInputs(fotosProteccionCivil),
          ];

          if (photoInputs.length) {
            const { saved, absoluteCreated } =
              await this.sapacStorageService.saveRegistroPhotos(
                idRegistro,
                photoInputs,
              );
            fotosRegistrosCreatedFiles.push(...absoluteCreated);

            const ahora = new Date();
            for (const item of saved) {
              const foto = await manager.save(
                Fotos,
                manager.create(Fotos, {
                  idRegistro,
                  ruta: item.publicUrl,
                  fechaHora: ahora,
                  idTipoFoto: item.idTipoFoto,
                }),
              );
              data.fotos?.push({
                id: Number(foto.id),
                idTipoFoto: item.idTipoFoto,
                ruta: item.publicUrl,
              });
            }
          }
        }

        let idLicenciaConstruccion: number | null = null;

        if (crearLicenciaConstruccion) {
          const {
            Corresponsables: corresponsablesData,
            ...lc
          } = licenciaConstruccionDto ?? {};
          const savedLc = await manager.save(
            LicenciaConstruccion,
            manager.create(LicenciaConstruccion, {
              idRegistro,
              tipoSolicitudLicencia: lc.TipoSolicitudLicencia ?? null,
              descripcionProyecto: lc.DescripcionProyecto ?? null,
              superficieTerrenoM2: lc.SuperficieTerrenoM2 ?? null,
              superficieTerrenoObraM2: lc.SuperficieTerrenoObraM2 ?? null,
              descripcionSistemaConstructivo:
                lc.DescripcionSistemaConstructivo ?? null,
              nombrePropietario: lc.NombrePropietario ?? null,
              domicilioNotificacion: lc.DomicilioNotificacion ?? null,
              rfc: lc.RFC ?? null,
              nombreDRO: lc.NombreDRO ?? null,
              noRegLicenciaConstruccion: lc.NoRegLicenciaConstruccion ?? null,
              cedulaProfesional: lc.CedulaProfesional ?? null,
              fecha: lc.Fecha ? new Date(lc.Fecha) : null,
              numeroExpediente: lc.NumeroExpediente ?? null,
              numeroControl: lc.NumeroControl ?? null,
              seguimientoObra: lc.SeguimientoObra ?? null,
              constanciaAlineamiento: lc.ConstanciaAlineamiento ?? null,
              licenciaUsoSuelo: lc.LicenciaUsoSuelo ?? null,
              planoAutorizado: lc.PlanoAutorizado ?? null,
              licenciaFraccionamiento: lc.LicenciaFraccionamiento ?? null,
              escrituras: lc.Escrituras ?? null,
              factibilidadAguaPotable: lc.FactibilidadAguaPotable ?? null,
              recibosPagoPredial: lc.RecibosPagoPredial ?? null,
              recibosMunicipales: lc.RecibosMunicipales ?? null,
              planoArquitectonicos: lc.PlanoArquitectonicos ?? null,
              otros: lc.Otros ?? null,
            }),
          );
          idLicenciaConstruccion = Number(savedLc.id);
          data.idLicenciaConstruccion = idLicenciaConstruccion;

          const corresponsablesValidos = (corresponsablesData ?? []).filter(
            (corresponsable) => hasCorresponsableData(corresponsable),
          );

          if (corresponsablesValidos.length > 0) {
            const idLc = idLicenciaConstruccion;
            const corresponsables = corresponsablesValidos.map(
              (corresponsable) =>
                manager.create(Corresponsables, {
                  idLicenciaConstruccion: idLc,
                  nombreCompleto: corresponsable.NombreCompleto ?? null,
                  noRegLicenciaConstruccion:
                    corresponsable.NoRegLicenciaConstruccion ?? null,
                  cedulaProfesional: corresponsable.CedulaProfesional ?? null,
                }),
            );
            const savedCorresponsables = await manager.save(corresponsables);
            data.corresponsables = savedCorresponsables.map((item) => ({
              id: Number(item.id),
              nombreCompleto: item.nombreCompleto,
              noRegLicenciaConstruccion: item.noRegLicenciaConstruccion,
              cedulaProfesional: item.cedulaProfesional,
            }));
          }
        }

        if (hasFirmas || hasDocumentosLc) {
          if (idLicenciaConstruccion == null) {
            throw new BadRequestException(
              'No se pueden registrar archivos de LicenciaConstruccion cuando PredioObra es 0.',
            );
          }

          const fotosResultado: FotoLicenciaResultado[] = [];
          const ahora = new Date();

          if (hasFirmas) {
            const { saved, absoluteCreated } =
              await this.storageService.saveFirmas(idRegistro, firmas);
            licenciaCreatedFiles.push(...absoluteCreated);

            for (const item of saved) {
              const foto = await manager.save(
                FotosLicenciaConstruccion,
                manager.create(FotosLicenciaConstruccion, {
                  idLicenciaConstruccion,
                  ruta: item.publicUrl,
                  fechaHora: ahora,
                  idTipoFoto: item.idTipoFoto,
                }),
              );
              fotosResultado.push({
                id: Number(foto.id),
                idTipoFoto: item.idTipoFoto,
                ruta: item.publicUrl,
              });
            }
          }

          if (hasDocumentosLc) {
            const { saved, absoluteCreated } =
              await this.storageService.saveDocumentoArrays(
                idRegistro,
                documentosLc,
              );
            licenciaCreatedFiles.push(...absoluteCreated);

            for (const item of saved) {
              const foto = await manager.save(
                FotosLicenciaConstruccion,
                manager.create(FotosLicenciaConstruccion, {
                  idLicenciaConstruccion,
                  ruta: item.publicUrl,
                  fechaHora: ahora,
                  idTipoFoto: item.idTipoFoto,
                }),
              );
              fotosResultado.push({
                id: Number(foto.id),
                idTipoFoto: item.idTipoFoto,
                ruta: item.publicUrl,
              });
            }
          }

          data.fotosLicenciaConstruccion = fotosResultado;
        }

        return data;
      });

      committed = true;

      // await this.bitacoraLogger.logToBitacora(
      //   'Registros',
      //   `Se creó el registro con ID: ${result.id}`,
      //   'CREATE',
      //   {
      //     registro: dto,
      //     idCapturistaVisita: result.idCapturistaVisita,
      //     sapac: sapacDto ?? null,
      //     idSapac: result.idSapac,
      //     catastro: catastroDto ?? null,
      //     idCatastro: result.idCatastro,
      //     licencia: licenciaDto ?? null,
      //     idLicencia: result.idLicencia,
      //     contacto: result.contacto ?? null,
      //     fotos: result.fotos ?? [],
      //     licenciaConstruccion: licenciaConstruccionDto ?? null,
      //     idLicenciaConstruccion: result.idLicenciaConstruccion,
      //     fotosLicenciaConstruccion: result.fotosLicenciaConstruccion ?? [],
      //   },
      //   Number(idUser),
      //   EnumModulos.REGISTROS,
      //   EstatusEnumBitcora.SUCCESS,
      // );

      return {
        status: 'success',
        message: 'Registro creado correctamente',
        data: result as ApiCrudResponse['data'],
      };
    } catch (error) {
      if (!committed) {
        if (licenciaCreatedFiles.length) {
          await this.storageService.cleanup(licenciaCreatedFiles);
        }
        if (fotosRegistrosCreatedFiles.length) {
          await this.sapacStorageService.cleanup(fotosRegistrosCreatedFiles);
        }
      }

      // await this.bitacoraLogger.logToBitacora(
      //   'Registros',
      //   'Error al crear registro',
      //   'CREATE',
      //   {
      //     registro: dto,
      //     sapac: sapacDto ?? null,
      //     catastro: catastroDto ?? null,
      //     licencia: licenciaDto ?? null,
      //     licenciaConstruccion: licenciaConstruccionDto ?? null,
      //   },
      //   Number(idUser),
      //   EnumModulos.REGISTROS,
      //   EstatusEnumBitcora.ERROR,
      //   error instanceof Error ? error.message : String(error),
      // );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear el registro');
    }
  }

  private buildSapacPhotoInputs(
    files: SapacFotoFiles,
  ): RegistroPhotoInput[] {
    const items: RegistroPhotoInput[] = [];
    for (const key of Object.keys(SAPAC_TIPO_FOTO) as SapacFotoKey[]) {
      const file = files[key];
      if (!file) continue;
      items.push({
        key,
        file,
        idTipoFoto: SAPAC_TIPO_FOTO[key],
      });
    }
    return items;
  }

  private buildCatastroPhotoInputs(
    files: CatastroFotoFiles,
  ): RegistroPhotoInput[] {
    const items: RegistroPhotoInput[] = [];
    for (const key of Object.keys(CATASTRO_TIPO_FOTO) as CatastroFotoKey[]) {
      const file = files[key];
      if (!file) continue;
      items.push({
        key,
        file,
        idTipoFoto: CATASTRO_TIPO_FOTO[key],
      });
    }
    return items;
  }

  private buildLicenciasPhotoInputs(
    files: LicenciasFotoFiles,
  ): RegistroPhotoInput[] {
    const items: RegistroPhotoInput[] = [];
    for (const key of Object.keys(LICENCIAS_TIPO_FOTO) as LicenciasFotoKey[]) {
      const file = files[key];
      if (!file) continue;
      items.push({
        key,
        file,
        idTipoFoto: LICENCIAS_TIPO_FOTO[key],
      });
    }
    return items;
  }

  private buildProteccionCivilPhotoInputs(
    files: ProteccionCivilFotoFiles,
  ): RegistroPhotoInput[] {
    const items: RegistroPhotoInput[] = [];
    for (const key of Object.keys(
      PROTECCION_CIVIL_TIPO_FOTO,
    ) as ProteccionCivilFotoKey[]) {
      const file = files[key];
      if (!file) continue;
      items.push({
        key,
        file,
        idTipoFoto: PROTECCION_CIVIL_TIPO_FOTO[key],
      });
    }
    return items;
  }

  private async assertTipoFotoCatalog(firmas: FirmaFiles): Promise<void> {
    const requiredIds = (Object.keys(firmas) as FirmaKey[])
      .filter((k) => firmas[k])
      .map((k) => FIRMA_TIPO_FOTO[k]);

    if (!requiredIds.length) return;

    const unique = [...new Set(requiredIds)];
    const found = await this.dataSource.getRepository(TipoFoto).find({
      where: { id: In(unique) },
      select: ['id'],
    });
    const foundIds = new Set(found.map((t) => Number(t.id)));

    for (const id of unique) {
      if (!foundIds.has(id)) {
        const key = (Object.keys(FIRMA_TIPO_FOTO) as FirmaKey[]).find(
          (k) => FIRMA_TIPO_FOTO[k] === id,
        );
        throw new BadRequestException(
          `El TipoFoto ${id} requerido para ${key ?? 'la firma'} no existe.`,
        );
      }
    }
  }

  private async assertDocumentoTipoFotoCatalog(
    files: LcDocumentoFiles,
  ): Promise<void> {
    const requiredIds = (Object.keys(files) as LcDocumentoKey[])
      .filter((key) => (files[key]?.length ?? 0) > 0)
      .map((key) => LICENCIA_CONSTRUCCION_DOCUMENTO_TIPO_FOTO[key]);

    if (!requiredIds.length) return;

    const unique = [...new Set(requiredIds)];
    const found = await this.dataSource.getRepository(TipoFoto).find({
      where: { id: In(unique) },
      select: ['id'],
    });
    const foundIds = new Set(found.map((tipo) => Number(tipo.id)));

    for (const id of unique) {
      if (foundIds.has(id)) continue;
      const key = (
        Object.keys(
          LICENCIA_CONSTRUCCION_DOCUMENTO_TIPO_FOTO,
        ) as LcDocumentoKey[]
      ).find((item) => LICENCIA_CONSTRUCCION_DOCUMENTO_TIPO_FOTO[item] === id);
      throw new BadRequestException(
        `El TipoFoto ${id} requerido para ${key ?? 'el documento de LicenciaConstruccion'} no existe.`,
      );
    }
  }

  private async assertSapacTipoFotoCatalog(
    files: SapacFotoFiles,
  ): Promise<void> {
    const requiredIds = (Object.keys(files) as SapacFotoKey[])
      .filter((key) => files[key])
      .map((key) => SAPAC_TIPO_FOTO[key]);

    if (!requiredIds.length) return;

    const unique = [...new Set(requiredIds)];
    const found = await this.dataSource.getRepository(TipoFoto).find({
      where: { id: In(unique) },
      select: ['id'],
    });
    const foundIds = new Set(found.map((tipo) => Number(tipo.id)));

    for (const id of unique) {
      if (foundIds.has(id)) continue;
      const key = (Object.keys(SAPAC_TIPO_FOTO) as SapacFotoKey[]).find(
        (item) => SAPAC_TIPO_FOTO[item] === id,
      );
      throw new BadRequestException(
        `El TipoFoto ${id} requerido para ${key ?? 'la fotografía SAPAC'} no existe.`,
      );
    }
  }

  private async assertCatastroTipoFotoCatalog(
    files: CatastroFotoFiles,
  ): Promise<void> {
    const requiredIds = (Object.keys(files) as CatastroFotoKey[])
      .filter((key) => files[key])
      .map((key) => CATASTRO_TIPO_FOTO[key]);

    if (!requiredIds.length) return;

    const unique = [...new Set(requiredIds)];
    const found = await this.dataSource.getRepository(TipoFoto).find({
      where: { id: In(unique) },
      select: ['id'],
    });
    const foundIds = new Set(found.map((tipo) => Number(tipo.id)));

    for (const id of unique) {
      if (foundIds.has(id)) continue;
      const key = (Object.keys(CATASTRO_TIPO_FOTO) as CatastroFotoKey[]).find(
        (item) => CATASTRO_TIPO_FOTO[item] === id,
      );
      throw new BadRequestException(
        `El TipoFoto ${id} requerido para ${key ?? 'la fotografía Catastro'} no existe.`,
      );
    }
  }

  private async assertLicenciasTipoFotoCatalog(
    files: LicenciasFotoFiles,
  ): Promise<void> {
    const requiredIds = (Object.keys(files) as LicenciasFotoKey[])
      .filter((key) => files[key])
      .map((key) => LICENCIAS_TIPO_FOTO[key]);

    if (!requiredIds.length) return;

    const unique = [...new Set(requiredIds)];
    const found = await this.dataSource.getRepository(TipoFoto).find({
      where: { id: In(unique) },
      select: ['id'],
    });
    const foundIds = new Set(found.map((tipo) => Number(tipo.id)));

    for (const id of unique) {
      if (foundIds.has(id)) continue;
      const key = (Object.keys(LICENCIAS_TIPO_FOTO) as LicenciasFotoKey[]).find(
        (item) => LICENCIAS_TIPO_FOTO[item] === id,
      );
      throw new BadRequestException(
        `El TipoFoto ${id} requerido para ${key ?? 'la fotografía Licencias'} no existe.`,
      );
    }
  }

  private async assertProteccionCivilTipoFotoCatalog(
    files: ProteccionCivilFotoFiles,
  ): Promise<void> {
    const requiredIds = (Object.keys(files) as ProteccionCivilFotoKey[])
      .filter((key) => files[key])
      .map((key) => PROTECCION_CIVIL_TIPO_FOTO[key]);

    if (!requiredIds.length) return;

    const unique = [...new Set(requiredIds)];
    const found = await this.dataSource.getRepository(TipoFoto).find({
      where: { id: In(unique) },
      select: ['id'],
    });
    const foundIds = new Set(found.map((tipo) => Number(tipo.id)));

    for (const id of unique) {
      if (foundIds.has(id)) continue;
      const key = (Object.keys(
        PROTECCION_CIVIL_TIPO_FOTO,
      ) as ProteccionCivilFotoKey[]).find(
        (item) => PROTECCION_CIVIL_TIPO_FOTO[item] === id,
      );
      throw new BadRequestException(
        `El TipoFoto ${id} requerido para ${key ?? 'la fotografía ProteccionCivil'} no existe.`,
      );
    }
  }

  private hasContactoRepresentanteData(
    contacto?: CreateContactoRepresentanteDto,
  ): boolean {
    if (!contacto) {
      return false;
    }

    return [
      contacto.Nombre,
      contacto.ApellidoPaterno,
      contacto.ApellidoMaterno,
      contacto.Telefono,
      contacto.Correo,
    ].some((value) => !isEmptyFormDataValue(value));
  }
}

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { ApiCrudResponse } from 'src/common/ApiResponse';
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
import {
  FIRMA_TIPO_FOTO,
  FirmaKey,
  LICENCIA_CONSTRUCCION_DOCUMENTO_TIPO_FOTO,
  LcDocumentoKey,
} from 'src/registros/licencia-construccion.constants';
import {
  FirmaFiles,
  LcDocumentoFiles,
  LicenciaConstruccionStorageService,
} from 'src/registros/licencia-construccion-storage.service';
import {
  RegistroPhotoInput,
  SapacStorageService,
} from 'src/registros/sapac-storage.service';
import { ActualizarRegistroDto } from './dto/actualizar-registro.dto';
import {
  UpdateCatastroDto,
  UpdateContactoDto,
  UpdateContactoRepresentanteDto,
  UpdateLicenciasDto,
  UpdateProteccionCivilDto,
  UpdateSapacDto,
} from './dto/section-update.dto';
import { UpdateCorresponsableDto } from './dto/update-corresponsable.dto';
import { UpdateLicenciaConstruccionDto } from './dto/update-licencia-construccion.dto';
import {
  hasCorresponsableUsefulFields,
  parseRegistroActualizarMultipart,
  peekIdRegistro,
  peekPredioObraFromBody,
} from './registro-actualizar-form.parser';
import {
  parseFotosFlujo0Actualizar,
  sanitizeFotosFlujo0ByPredioObra,
} from './registro-actualizar-fotos-flujo0';
import {
  parseLcActualizarFiles,
  sanitizeLcFilesByPredioObra,
} from './registro-actualizar-lc-files';
import {
  assignUseful,
  assignUsefulFields,
  tieneValorActualizable,
} from './registro-actualizar.util';

const CAMPOS_LICENCIA_CONSTRUCCION = [
  'TipoSolicitudLicencia',
  'DescripcionProyecto',
  'SuperficieTerrenoM2',
  'SuperficieTerrenoObraM2',
  'DescripcionSistemaConstructivo',
  'NombrePropietario',
  'DomicilioNotificacion',
  'RFC',
  'NombreDRO',
  'NoRegLicenciaConstruccion',
  'CedulaProfesional',
  'Fecha',
  'NumeroExpediente',
  'NumeroControl',
  'SeguimientoObra',
  'ConstanciaAlineamiento',
  'LicenciaUsoSuelo',
  'PlanoAutorizado',
  'LicenciaFraccionamiento',
  'Escrituras',
  'FactibilidadAguaPotable',
  'RecibosPagoPredial',
  'RecibosMunicipales',
  'PlanoArquitectonicos',
  'Otros',
] as const;

const LC_DTO_TO_ENTITY: Record<(typeof CAMPOS_LICENCIA_CONSTRUCCION)[number], string> =
  {
    TipoSolicitudLicencia: 'tipoSolicitudLicencia',
    DescripcionProyecto: 'descripcionProyecto',
    SuperficieTerrenoM2: 'superficieTerrenoM2',
    SuperficieTerrenoObraM2: 'superficieTerrenoObraM2',
    DescripcionSistemaConstructivo: 'descripcionSistemaConstructivo',
    NombrePropietario: 'nombrePropietario',
    DomicilioNotificacion: 'domicilioNotificacion',
    RFC: 'rfc',
    NombreDRO: 'nombreDRO',
    NoRegLicenciaConstruccion: 'noRegLicenciaConstruccion',
    CedulaProfesional: 'cedulaProfesional',
    Fecha: 'fecha',
    NumeroExpediente: 'numeroExpediente',
    NumeroControl: 'numeroControl',
    SeguimientoObra: 'seguimientoObra',
    ConstanciaAlineamiento: 'constanciaAlineamiento',
    LicenciaUsoSuelo: 'licenciaUsoSuelo',
    PlanoAutorizado: 'planoAutorizado',
    LicenciaFraccionamiento: 'licenciaFraccionamiento',
    Escrituras: 'escrituras',
    FactibilidadAguaPotable: 'factibilidadAguaPotable',
    RecibosPagoPredial: 'recibosPagoPredial',
    RecibosMunicipales: 'recibosMunicipales',
    PlanoArquitectonicos: 'planoArquitectonicos',
    Otros: 'otros',
  };

const CAMPOS_CORRESPONSABLE = [
  'NombreCompleto',
  'NoRegLicenciaConstruccion',
  'CedulaProfesional',
] as const;

const CORR_DTO_TO_ENTITY: Record<(typeof CAMPOS_CORRESPONSABLE)[number], string> =
  {
    NombreCompleto: 'nombreCompleto',
    NoRegLicenciaConstruccion: 'noRegLicenciaConstruccion',
    CedulaProfesional: 'cedulaProfesional',
  };

type FotoLcResultado = {
  id: number;
  idTipoFoto: number;
  ruta: string;
};

type FotoFlujo0Resultado = {
  id: number;
  idTipoFoto: number;
  ruta: string;
  accion: 'creada' | 'actualizada';
};

@Injectable()
export class RegistrosActualizarService {
  private readonly logger = new Logger(RegistrosActualizarService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly storageService: LicenciaConstruccionStorageService,
    private readonly sapacStorageService: SapacStorageService,
  ) {}

  async updateFromMultipart(
    body: Record<string, unknown>,
    uploadedFiles: Record<string, Express.Multer.File[]> = {},
  ): Promise<ApiCrudResponse> {
    const idRegistro = peekIdRegistro(body);

    const registroActual = await this.dataSource
      .getRepository(Registros)
      .findOne({ where: { id: idRegistro } });

    if (!registroActual) {
      throw new NotFoundException(
        `No se encontró el registro con Id ${idRegistro}`,
      );
    }

    const predioFromBody = peekPredioObraFromBody(body);
    const predioObraEfectivo: 0 | 1 =
      predioFromBody !== undefined
        ? predioFromBody
        : Number(registroActual.predioObra) === 1
          ? 1
          : 0;

    const parsed = await parseRegistroActualizarMultipart(
      body,
      predioObraEfectivo,
    );

    const sanitizedLcFiles = sanitizeLcFilesByPredioObra(
      uploadedFiles,
      predioObraEfectivo,
    );
    const lcFiles = parseLcActualizarFiles(sanitizedLcFiles);

    const sanitizedFotos0 = sanitizeFotosFlujo0ByPredioObra(
      uploadedFiles,
      predioObraEfectivo,
    );
    const fotos0 = parseFotosFlujo0Actualizar(sanitizedFotos0);

    if (lcFiles.hasFirmas) {
      this.storageService.assertValidFirmaFiles(lcFiles.firmas);
      await this.assertTipoFotoCatalog(lcFiles.firmas);
    }
    if (lcFiles.hasDocumentos) {
      this.storageService.assertValidDocumentoFiles(lcFiles.documentosLc);
      await this.assertDocumentoTipoFotoCatalog(lcFiles.documentosLc);
    }
    if (fotos0.hasFotos) {
      this.sapacStorageService.assertValidPhotoInputs(fotos0.photoInputs);
      await this.assertFotosFlujo0TipoFotoCatalog(fotos0.photoInputs);
    }

    const hayCambios =
      parsed.hasRootUsefulFields ||
      parsed.hasSapac ||
      parsed.hasCatastro ||
      parsed.hasLicencias ||
      parsed.hasContacto ||
      parsed.hasProteccionCivil ||
      parsed.hasContactoRepresentante ||
      parsed.hasLicenciaConstruccion ||
      parsed.hasCorresponsables ||
      lcFiles.hasFirmas ||
      lcFiles.hasDocumentos ||
      fotos0.hasFotos;

    if (!hayCambios) {
      throw new BadRequestException(
        'Debe proporcionar al menos un atributo o archivo válido para actualizar',
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
        const registro = await manager.findOne(Registros, {
          where: { id: idRegistro },
        });
        if (!registro) {
          throw new NotFoundException(
            `No se encontró el registro con Id ${idRegistro}`,
          );
        }

        const estatusOriginal = registro.estatus;
        this.applyRegistroRoot(registro, parsed.registro);
        registro.estatus = estatusOriginal;
        await manager.save(Registros, registro);

        const predioFinal: 0 | 1 =
          registro.predioObra != null && Number(registro.predioObra) === 1
            ? 1
            : 0;

        let idSapac: number | null = null;
        let idCatastro: number | null = null;
        let idLicencia: number | null = null;
        let contacto: { id: number } | null = null;
        let idProteccionCivil: number | null = null;
        let contactoRepresentante: { id: number } | null = null;
        let idLicenciaConstruccion: number | null = null;
        let corresponsables: {
          id: number;
          nombreCompleto: string | null;
        }[] = [];
        let fotosLicenciaConstruccion: FotoLcResultado[] = [];
        let fotos: FotoFlujo0Resultado[] = [];

        if (predioFinal === 0) {
          if (parsed.hasSapac && parsed.sapac) {
            idSapac = await this.upsertSapac(
              manager,
              idRegistro,
              parsed.sapac,
            );
          }
          if (parsed.hasCatastro && parsed.catastro) {
            idCatastro = await this.upsertCatastro(
              manager,
              idRegistro,
              parsed.catastro,
            );
          }
          if (
            (parsed.hasLicencias && parsed.licencias) ||
            (parsed.hasContacto && parsed.contacto)
          ) {
            const lic = await this.upsertLicenciasYContacto(
              manager,
              idRegistro,
              parsed.hasLicencias ? parsed.licencias : undefined,
              parsed.hasContacto ? parsed.contacto : undefined,
            );
            idLicencia = lic.idLicencia;
            contacto = lic.contacto;
          }
          if (
            (parsed.hasProteccionCivil && parsed.proteccionCivil) ||
            (parsed.hasContactoRepresentante && parsed.contactoRepresentante)
          ) {
            const pc = await this.upsertProteccionCivilYRepresentante(
              manager,
              idRegistro,
              parsed.hasProteccionCivil ? parsed.proteccionCivil : undefined,
              parsed.hasContactoRepresentante
                ? parsed.contactoRepresentante
                : undefined,
            );
            idProteccionCivil = pc.idProteccionCivil;
            contactoRepresentante = pc.contactoRepresentante;
          }

          if (fotos0.needsSapac && idSapac == null) {
            idSapac = await this.ensureSapac(manager, idRegistro);
          }
          if (fotos0.needsCatastro && idCatastro == null) {
            idCatastro = await this.ensureCatastro(manager, idRegistro);
          }
          if (fotos0.needsLicencias && idLicencia == null) {
            idLicencia = await this.ensureLicencias(manager, idRegistro);
          }
          if (fotos0.needsProteccionCivil && idProteccionCivil == null) {
            idProteccionCivil = await this.ensureProteccionCivil(
              manager,
              idRegistro,
            );
          }

          if (fotos0.hasFotos) {
            fotos = await this.saveAndUpsertFotosFlujo0(
              manager,
              idRegistro,
              fotos0.photoInputs,
            );
          }
        }

        if (predioFinal === 1) {
          const needLc =
            parsed.hasLicenciaConstruccion ||
            parsed.hasCorresponsables ||
            lcFiles.hasFirmas ||
            lcFiles.hasDocumentos;

          if (needLc) {
            const lcResult =
              await this.upsertLicenciaConstruccionYCorresponsables(
                manager,
                idRegistro,
                parsed.licenciaConstruccion,
                parsed.hasLicenciaConstruccion,
                parsed.hasCorresponsables,
                lcFiles.hasFirmas || lcFiles.hasDocumentos,
              );
            idLicenciaConstruccion = lcResult.idLicenciaConstruccion;
            corresponsables = lcResult.corresponsables;
          }

          if (
            (lcFiles.hasFirmas || lcFiles.hasDocumentos) &&
            idLicenciaConstruccion != null
          ) {
            fotosLicenciaConstruccion = await this.saveLcFiles(
              manager,
              idRegistro,
              idLicenciaConstruccion,
              lcFiles.firmas,
              lcFiles.documentosLc,
              lcFiles.hasFirmas,
              lcFiles.hasDocumentos,
            );
          }
        }

        return {
          id: Number(registro.id),
          nombre: '',
          predioObra: registro.predioObra ?? null,
          idSapac,
          idCatastro,
          idLicencia,
          contacto,
          idProteccionCivil,
          contactoRepresentante,
          idLicenciaConstruccion,
          corresponsables,
          fotosLicenciaConstruccion,
          fotos,
        };
      });

    return {
      status: 'success',
      message: 'Registro actualizado correctamente',
      data: result as ApiCrudResponse['data'],
    };
  }

  /** Compatibilidad con el método anterior del controller. */
  async actualizarRegistro(
    dto: ActualizarRegistroDto,
  ): Promise<ApiCrudResponse> {
    const body: Record<string, unknown> = { ...dto };
    return this.updateFromMultipart(body);
  }

  private async saveLcFiles(
    manager: EntityManager,
    idRegistro: number,
    idLicenciaConstruccion: number,
    firmas: FirmaFiles,
    documentosLc: LcDocumentoFiles,
    hasFirmas: boolean,
    hasDocumentos: boolean,
  ): Promise<FotoLcResultado[]> {
    const fotosResultado: FotoLcResultado[] = [];
    const ahora = new Date();

    if (hasFirmas) {
      const { saved } = await this.storageService.saveFirmas(
        idRegistro,
        firmas,
      );
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

    if (hasDocumentos) {
      const { saved } = await this.storageService.saveDocumentoArrays(
        idRegistro,
        documentosLc,
      );
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

    return fotosResultado;
  }

  private async saveAndUpsertFotosFlujo0(
    manager: EntityManager,
    idRegistro: number,
    photoInputs: RegistroPhotoInput[],
  ): Promise<FotoFlujo0Resultado[]> {
    const { saved } = await this.sapacStorageService.saveRegistroPhotos(
      idRegistro,
      photoInputs,
    );

    const resultados: FotoFlujo0Resultado[] = [];
    for (const item of saved) {
      const foto = await this.createOrReplaceFotoUrl(manager, {
        idRegistro,
        idTipoFoto: item.idTipoFoto,
        nuevaUrl: item.publicUrl,
      });
      resultados.push({
        id: Number(foto.entity.id),
        idTipoFoto: item.idTipoFoto,
        ruta: item.publicUrl,
        accion: foto.accion,
      });
    }
    return resultados;
  }

  /**
   * Actualiza Ruta de la fila con Id mayor si hay duplicados históricos;
   * no elimina filas ni archivos físicos.
   */
  private async createOrReplaceFotoUrl(
    manager: EntityManager,
    params: {
      idRegistro: number;
      idTipoFoto: number;
      nuevaUrl: string;
    },
  ): Promise<{ entity: Fotos; accion: 'creada' | 'actualizada' }> {
    const existentes = await manager.find(Fotos, {
      where: {
        idRegistro: params.idRegistro,
        idTipoFoto: params.idTipoFoto,
      },
      order: { id: 'DESC' },
    });

    if (existentes.length > 1) {
      this.logger.warn(
        `Fotos duplicadas para IdRegistro=${params.idRegistro} IdTipoFoto=${params.idTipoFoto}: se actualizará Id=${existentes[0].id}`,
      );
    }

    if (existentes.length > 0) {
      const foto = existentes[0];
      foto.ruta = params.nuevaUrl;
      foto.fechaHora = new Date();
      const saved = await manager.save(Fotos, foto);
      return { entity: saved, accion: 'actualizada' };
    }

    const created = await manager.save(
      Fotos,
      manager.create(Fotos, {
        idRegistro: params.idRegistro,
        idTipoFoto: params.idTipoFoto,
        ruta: params.nuevaUrl,
        fechaHora: new Date(),
      }),
    );
    return { entity: created, accion: 'creada' };
  }

  private async ensureSapac(
    manager: EntityManager,
    idRegistro: number,
  ): Promise<number> {
    let sapac = await manager.findOne(Sapac, {
      where: { idRegistro },
      order: { id: 'DESC' },
    });
    if (!sapac) {
      sapac = await manager.save(
        Sapac,
        manager.create(Sapac, { idRegistro }),
      );
    }
    return Number(sapac.id);
  }

  private async ensureCatastro(
    manager: EntityManager,
    idRegistro: number,
  ): Promise<number> {
    let catastro = await manager.findOne(Catastro, {
      where: { idRegistro },
      order: { id: 'DESC' },
    });
    if (!catastro) {
      catastro = await manager.save(
        Catastro,
        manager.create(Catastro, { idRegistro }),
      );
    }
    return Number(catastro.id);
  }

  private async ensureLicencias(
    manager: EntityManager,
    idRegistro: number,
  ): Promise<number> {
    let licencia = await manager.findOne(Licencias, {
      where: { idRegistro },
      order: { id: 'DESC' },
    });
    if (!licencia) {
      licencia = await manager.save(
        Licencias,
        manager.create(Licencias, { idRegistro }),
      );
    }
    return Number(licencia.id);
  }

  private async ensureProteccionCivil(
    manager: EntityManager,
    idRegistro: number,
  ): Promise<number> {
    let pc = await manager.findOne(ProteccionCivil, {
      where: { idRegistro },
      order: { id: 'DESC' },
    });
    if (!pc) {
      pc = await manager.save(
        ProteccionCivil,
        manager.create(ProteccionCivil, { idRegistro }),
      );
    }
    return Number(pc.id);
  }

  private async assertFotosFlujo0TipoFotoCatalog(
    inputs: RegistroPhotoInput[],
  ): Promise<void> {
    const requiredIds = [...new Set(inputs.map((i) => i.idTipoFoto))];
    if (!requiredIds.length) return;

    const found = await this.dataSource.getRepository(TipoFoto).find({
      where: { id: In(requiredIds) },
      select: ['id'],
    });
    const foundIds = new Set(found.map((t) => Number(t.id)));

    for (const id of requiredIds) {
      if (!foundIds.has(id)) {
        throw new BadRequestException(
          `El TipoFoto ${id} requerido para la fotografía del registro no existe.`,
        );
      }
    }
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

  private applyRegistroRoot(
    registro: Registros,
    dto: ActualizarRegistroDto,
  ): void {
    const map: Record<string, unknown> = {
      registro: dto.Registro,
      latitud: dto.Latitud,
      longitud: dto.Longitud,
      entidadFederativa: dto.EntidadFederativa,
      municipio: dto.Municipio,
      localidad: dto.Localidad,
      colonia: dto.Colonia,
      calle: dto.Calle,
      noInterior: dto.NoInterior,
      noExterior: dto.NoExterior,
      cp: dto.CP,
      tipoRegistro: dto.TipoRegistro,
      predioObra: dto.PredioObra,
    };
    assignUseful(registro, map);
  }

  private async upsertLicenciaConstruccionYCorresponsables(
    manager: EntityManager,
    idRegistro: number,
    dto: UpdateLicenciaConstruccionDto | undefined,
    hasLcScalars: boolean,
    hasCorresponsables: boolean,
    ensureForFiles = false,
  ): Promise<{
    idLicenciaConstruccion: number | null;
    corresponsables: { id: number; nombreCompleto: string | null }[];
  }> {
    let lc = await manager.findOne(LicenciaConstruccion, {
      where: { idRegistro },
    });

    const needLc =
      hasLcScalars ||
      ensureForFiles ||
      (hasCorresponsables &&
        (dto?.Corresponsables ?? []).some((c) =>
          hasCorresponsableUsefulFields(c),
        ));

    if (!needLc) {
      return {
        idLicenciaConstruccion: lc ? Number(lc.id) : null,
        corresponsables: [],
      };
    }

    if (!lc) {
      lc = manager.create(LicenciaConstruccion, { idRegistro });
    }

    if (dto && hasLcScalars) {
      const scalarFields = CAMPOS_LICENCIA_CONSTRUCCION.filter(
        (field) => field !== 'Fecha',
      );
      assignUsefulFields(lc, dto, scalarFields, (field) =>
        LC_DTO_TO_ENTITY[field],
      );
      if (tieneValorActualizable(dto.Fecha)) {
        lc.fecha = new Date(dto.Fecha!);
      }
    }

    lc = await manager.save(LicenciaConstruccion, lc);
    const idLc = Number(lc.id);

    const touched: { id: number; nombreCompleto: string | null }[] = [];

    if (hasCorresponsables && dto?.Corresponsables?.length) {
      for (const item of dto.Corresponsables) {
        if (!hasCorresponsableUsefulFields(item)) {
          continue;
        }
        const saved = await this.upsertCorresponsable(manager, idLc, item);
        touched.push({
          id: Number(saved.id),
          nombreCompleto: saved.nombreCompleto,
        });
      }
    }

    return {
      idLicenciaConstruccion: idLc,
      corresponsables: touched,
    };
  }

  private async upsertCorresponsable(
    manager: EntityManager,
    idLicenciaConstruccion: number,
    dto: UpdateCorresponsableDto,
  ): Promise<Corresponsables> {
    if (tieneValorActualizable(dto.Id)) {
      const existing = await manager.findOne(Corresponsables, {
        where: { id: dto.Id },
      });
      if (!existing) {
        throw new NotFoundException(
          `No se encontró el corresponsable con Id ${dto.Id}`,
        );
      }
      if (Number(existing.idLicenciaConstruccion) !== idLicenciaConstruccion) {
        throw new BadRequestException(
          'El corresponsable indicado no pertenece a la licencia de construcción del registro',
        );
      }
      assignUsefulFields(existing, dto, CAMPOS_CORRESPONSABLE, (field) =>
        CORR_DTO_TO_ENTITY[field],
      );
      return manager.save(Corresponsables, existing);
    }

    const created = manager.create(Corresponsables, {
      idLicenciaConstruccion,
    });
    assignUsefulFields(created, dto, CAMPOS_CORRESPONSABLE, (field) =>
      CORR_DTO_TO_ENTITY[field],
    );
    return manager.save(Corresponsables, created);
  }

  private async upsertSapac(
    manager: EntityManager,
    idRegistro: number,
    dto: UpdateSapacDto,
  ): Promise<number> {
    if (tieneValorActualizable(dto.IdTipoServicio)) {
      const tipoServicio = await manager.query(
        'SELECT Id FROM TipoServicio WHERE Id = ? LIMIT 1',
        [dto.IdTipoServicio],
      );
      if (!Array.isArray(tipoServicio) || tipoServicio.length === 0) {
        throw new BadRequestException(
          `El TipoServicio ${dto.IdTipoServicio} no existe.`,
        );
      }
    }

    let sapac = await manager.findOne(Sapac, {
      where: { idRegistro },
      order: { id: 'DESC' },
    });
    if (!sapac) {
      sapac = manager.create(Sapac, { idRegistro });
    }

    assignUseful(sapac, {
      numeroCuenta: dto.NumeroCuenta,
      nombre: dto.Nombre,
      apellidoPaterno: dto.ApellidoPaterno,
      apellidoMaterno: dto.ApellidoMaterno,
      rfc: dto.RFC,
      sector: dto.Sector,
      ruta: dto.Ruta,
      folio: dto.Folio,
      idTipoServicio: dto.IdTipoServicio,
      medidor: dto.Medidor,
    });

    const saved = await manager.save(Sapac, sapac);
    return Number(saved.id);
  }

  private async upsertCatastro(
    manager: EntityManager,
    idRegistro: number,
    dto: UpdateCatastroDto,
  ): Promise<number> {
    let catastro = await manager.findOne(Catastro, {
      where: { idRegistro },
      order: { id: 'DESC' },
    });
    if (!catastro) {
      catastro = manager.create(Catastro, { idRegistro });
    }

    assignUseful(catastro, {
      clave: dto.Clave,
      m2: dto.M2,
      superficie: dto.Superficie,
      usoSuelo: dto.UsoSuelo,
    });

    const saved = await manager.save(Catastro, catastro);
    return Number(saved.id);
  }

  private async upsertLicenciasYContacto(
    manager: EntityManager,
    idRegistro: number,
    licenciaDto: UpdateLicenciasDto | undefined,
    contactoDto: UpdateContactoDto | undefined,
  ): Promise<{
    idLicencia: number | null;
    contacto: { id: number } | null;
  }> {
    let licencia = await manager.findOne(Licencias, {
      where: { idRegistro },
      order: { id: 'DESC' },
    });

    if (licenciaDto) {
      if (!licencia) {
        licencia = manager.create(Licencias, { idRegistro });
      }
      assignUseful(licencia, {
        registro: licenciaDto.Registro,
        nombreComercial: licenciaDto.NombreComercial,
        giro: licenciaDto.Giro,
        licenciaSuelo: licenciaDto.LicenciaSuelo,
        nombrePropietario: licenciaDto.NombrePropietario,
        apellidoPaternoPropietario: licenciaDto.ApellidoPaternoPropietario,
        apellidoMaternoPropietario: licenciaDto.ApellidoMaternoPropietario,
        tipoPersona: licenciaDto.TipoPersona,
        rfc: licenciaDto.RFC,
        estacionamiento: licenciaDto.Estacionamiento,
        tipo: licenciaDto.Tipo,
      });
      if (tieneValorActualizable(licenciaDto.FechaExpedicion)) {
        licencia.fechaExpedicion = new Date(licenciaDto.FechaExpedicion!);
      }
      if (tieneValorActualizable(licenciaDto.FechaRefrendo)) {
        licencia.fechaRefrendo = new Date(licenciaDto.FechaRefrendo!);
      }
      if (tieneValorActualizable(licenciaDto.FechaHora)) {
        licencia.fechaHora = new Date(licenciaDto.FechaHora!);
      }
      licencia = await manager.save(Licencias, licencia);
    } else if (contactoDto && !licencia) {
      licencia = await manager.save(
        Licencias,
        manager.create(Licencias, { idRegistro }),
      );
    }

    let contactoResult: { id: number } | null = null;
    if (contactoDto) {
      let contacto = await manager.findOne(Contactos, {
        where: { idRegistro },
        order: { id: 'DESC' },
      });
      if (!contacto) {
        contacto = manager.create(Contactos, { idRegistro });
      }
      assignUseful(contacto, {
        nombre: contactoDto.Nombre,
        apellidoPaterno: contactoDto.ApellidoPaterno,
        apellidoMaterno: contactoDto.ApellidoMaterno,
        telefono: contactoDto.Telefono,
        correo: contactoDto.Correo,
      });
      const saved = await manager.save(Contactos, contacto);
      contactoResult = { id: Number(saved.id) };
    }

    return {
      idLicencia: licencia ? Number(licencia.id) : null,
      contacto: contactoResult,
    };
  }

  private async upsertProteccionCivilYRepresentante(
    manager: EntityManager,
    idRegistro: number,
    pcDto: UpdateProteccionCivilDto | undefined,
    representanteDto: UpdateContactoRepresentanteDto | undefined,
  ): Promise<{
    idProteccionCivil: number | null;
    contactoRepresentante: { id: number } | null;
  }> {
    let pc = await manager.findOne(ProteccionCivil, {
      where: { idRegistro },
      order: { id: 'DESC' },
    });

    if (pcDto) {
      if (!pc) {
        pc = manager.create(ProteccionCivil, { idRegistro });
      }
      assignUseful(pc, {
        esEmpresa: pcDto.EsEmpresa,
        razonSocial: pcDto.RazonSocial,
        rfc: pcDto.RFC,
        nombre: pcDto.Nombre,
        apellidoPaterno: pcDto.ApellidoPaterno,
        apellidoMaterno: pcDto.ApellidoMaterno,
        telefono: pcDto.Telefono,
        registroAcreditacion: pcDto.RegistroAcreditacion,
        tienePrograma: pcDto.TienePrograma,
      });
      pc = await manager.save(ProteccionCivil, pc);
    } else if (representanteDto && !pc) {
      pc = await manager.save(
        ProteccionCivil,
        manager.create(ProteccionCivil, { idRegistro }),
      );
    }

    let representanteResult: { id: number } | null = null;
    if (representanteDto) {
      let representante = await manager.findOne(ContactoRepresentante, {
        where: { idRegistro },
        order: { id: 'DESC' },
      });
      if (!representante) {
        representante = manager.create(ContactoRepresentante, { idRegistro });
      }
      assignUseful(representante, {
        nombre: representanteDto.Nombre,
        apellidoPaterno: representanteDto.ApellidoPaterno,
        apellidoMaterno: representanteDto.ApellidoMaterno,
        telefono: representanteDto.Telefono,
        correo: representanteDto.Correo,
      });
      const saved = await manager.save(ContactoRepresentante, representante);
      representanteResult = { id: Number(saved.id) };
    }

    return {
      idProteccionCivil: pc ? Number(pc.id) : null,
      contactoRepresentante: representanteResult,
    };
  }
}

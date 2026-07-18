import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, In, SelectQueryBuilder } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { BitacoraLoggerService } from 'src/bitacora/bitacora.service';
import {
  ApiCrudResponse,
  ApiResponseCommon,
  EstatusEnumBitcora,
} from 'src/common/ApiResponse';
import { EnumModulos } from 'src/common/estatus.enum';
import { RegistroFotoResponseDto } from 'src/common/dto/registro-foto-response.dto';
import { CapturistaVisita } from 'src/entities/CapturistaVisita';
import { Catastro } from 'src/entities/Catastro';
import { ContactoRepresentante } from 'src/entities/ContactoRepresentante';
import { Contactos } from 'src/entities/Contactos';
import { Corresponsables } from 'src/entities/Corresponsables';
import { Fotos } from 'src/entities/Fotos';
import { FotosLicenciaConstruccion } from 'src/entities/FotosLicenciaConstruccion';
import { Grupos } from 'src/entities/Grupos';
import { LicenciaConstruccion } from 'src/entities/LicenciaConstruccion';
import { Licencias } from 'src/entities/Licencias';
import { ProteccionCivil } from 'src/entities/ProteccionCivil';
import { Registros } from 'src/entities/Registros';
import { Sapac } from 'src/entities/Sapac';
import { TipoFoto } from 'src/entities/TipoFoto';
import { Usuarios } from 'src/entities/Usuarios';
import { MonitoreoService } from 'src/monitoreo/monitoreo.service';
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
import { GetRegistrosByDateRangeDto } from './dto/get-registros-by-date-range.dto';
import { GetRegistrosQueryDto } from './dto/get-registros-query.dto';
import { RegistroListadoItemDto } from './dto/registro-listado-item.dto';
import { UpdateRegistroEstatusDto } from './dto/update-registro-estatus.dto';
import {
  buildEndExclusiveDateLocal,
  buildStartDateLocal,
} from './registro-date-range';
import {
  LC_FILE_FIELD_NAMES,
  LC_FILE_KEYS,
  LC_FILE_TIPO_FOTO,
} from './licencia-construccion.constants';
import {
  hasContactoData,
  hasCorresponsableData,
  isEmptyFormDataValue,
} from './licencia-construccion.sanitize';
import {
  LcFiles,
  LicenciaConstruccionStorageService,
} from './licencia-construccion-storage.service';
import {
  LICENCIAS_TIPO_FOTO,
  LICENCIAS_TRANSVERSAL_FOTO_KEYS,
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

const REGISTRO_ESTATUS_DESCRIPCIONES: Record<number, string> = {
  1: 'Información Faltante',
  2: 'Rechazo o Sin respuesta',
  3: 'Datos Correctos',
  4: 'Revisión',
  5: 'Baja',
};

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

type CapturistaVisitaFlatFields = {
  idCapturistaVisita: number | null;
  idRegistroCapturistaVisita: number | null;
  idCapturista: number | null;
  nombreCapturista: string | null;
  apellidoPaternoCapturista: string | null;
  apellidoMaternoCapturista: string | null;
  nombreCompletoCapturista: string | null;
  idGrupoCapturista: number | null;
  nombreGrupoCapturista: string | null;
  idSupervisor: number | null;
  nombreSupervisor: string | null;
  apellidoPaternoSupervisor: string | null;
  apellidoMaternoSupervisor: string | null;
  nombreCompletoSupervisor: string | null;
  idGrupoSupervisor: number | null;
  nombreGrupoSupervisor: string | null;
  idGrupoCapturistaVisita: number | null;
  fechaHoraCapturistaVisita: Date | null;
};

type UsuarioNombre = Pick<
  Usuarios,
  'id' | 'nombre' | 'apellidoPaterno' | 'apellidoMaterno' | 'idGrupo'
>;

type GrupoNombre = Pick<Grupos, 'id' | 'nombre'>;

/** Fotos de fachada/estacionamiento/bodega en listados de consulta. */
const FOTOS_TIPOS_LISTADO = [
  LICENCIAS_TIPO_FOTO.fachada,
  LICENCIAS_TIPO_FOTO.estacionamiento,
  LICENCIAS_TIPO_FOTO.bodega,
] as const;

@Injectable()
export class RegistrosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bitacoraLogger: BitacoraLoggerService,
    private readonly storageService: LicenciaConstruccionStorageService,
    private readonly sapacStorageService: SapacStorageService,
    private readonly monitoreoService: MonitoreoService,
  ) { }

  /**
   * Detalle completo por Id (mismo contrato que GET /monitoreo/:idRegistro).
   * Reutiliza MonitoreoService como fuente de verdad de relaciones y mapper.
   */
  async findOne(
    idRegistro: number,
    user: AuthenticatedUser,
  ): Promise<{ data: Record<string, unknown> }> {
    try {
      return await this.monitoreoService.findOne(idRegistro, user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(
          'No se encontró el registro solicitado.',
        );
      }
      if (error instanceof ForbiddenException) {
        const message =
          typeof error.message === 'string' ? error.message : '';
        if (message.includes('monitoreo')) {
          throw new ForbiddenException(
            'No tienes permisos para consultar los registros.',
          );
        }
        if (message.includes('grupo asignado')) {
          throw error;
        }
        if (message.includes('identificar al usuario')) {
          throw error;
        }
        throw new ForbiddenException(
          'No tienes permisos para consultar los registros.',
        );
      }
      throw error;
    }
  }

  async updateEstatus(
    idRegistro: number,
    dto: UpdateRegistroEstatusDto,
    user: AuthenticatedUser,
  ): Promise<{
    message: string;
    data: {
      idRegistro: number;
      estatus: number;
      descripcionEstatus: string;
      idSupervisor: number;
    };
  }> {
    if (!Number.isInteger(idRegistro) || idRegistro < 1) {
      throw new BadRequestException(
        'El identificador del registro no es válido.',
      );
    }

    const idUsuario = user.userId;
    if (
      idUsuario === undefined ||
      idUsuario === null ||
      !Number.isInteger(Number(idUsuario)) ||
      Number(idUsuario) < 1
    ) {
      throw new UnauthorizedException(
        'No fue posible identificar al usuario autenticado.',
      );
    }

    const idRol = Number(user.rol);
    if (![2, 3, 4].includes(idRol)) {
      throw new ForbiddenException(
        'No tienes permisos para actualizar el estatus del registro.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    let transactionStarted = false;

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      transactionStarted = true;

      const registro = await queryRunner.manager.findOne(Registros, {
        where: { id: idRegistro },
      });

      if (!registro) {
        throw new NotFoundException(
          'No se encontró el registro solicitado.',
        );
      }

      if (idRol === 2) {
        const idGrupo = user.idGrupo;
        if (
          idGrupo === undefined ||
          idGrupo === null ||
          String(idGrupo).trim() === ''
        ) {
          throw new ForbiddenException(
            'El usuario supervisor no tiene un grupo asignado.',
          );
        }

        const visitaDelGrupo = await queryRunner.manager.findOne(
          CapturistaVisita,
          {
            where: { idRegistro, idGrupo },
            order: { fechaHora: 'DESC', id: 'DESC' },
          },
        );

        if (!visitaDelGrupo) {
          throw new ForbiddenException(
            'No tienes permisos para actualizar este registro.',
          );
        }
      }

      await queryRunner.manager.update(
        Registros,
        { id: idRegistro },
        { estatus: dto.estatus },
      );

      const visita = await queryRunner.manager.findOne(CapturistaVisita, {
        where: { idRegistro },
        order: { fechaHora: 'DESC', id: 'DESC' },
      });
      const fechaHora = new Date();

      if (visita) {
        await queryRunner.manager.update(
          CapturistaVisita,
          { id: visita.id },
          {
            idSupervisor: Number(idUsuario),
            fechaHora,
          },
        );
      } else {
        await queryRunner.manager.insert(CapturistaVisita, {
          idRegistro,
          idCapturista: null,
          idSupervisor: Number(idUsuario),
          idGrupo: null,
          fechaHora,
        });
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Estatus actualizado correctamente.',
        data: {
          idRegistro,
          estatus: dto.estatus,
          descripcionEstatus: REGISTRO_ESTATUS_DESCRIPCIONES[dto.estatus],
          idSupervisor: Number(idUsuario),
        },
      };
    } catch (error) {
      if (transactionStarted) {
        await queryRunner.rollbackTransaction();
      }
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al actualizar el estatus del registro',
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lista paginada de Registros + Licencias + capturista/supervisor (plano)
   * con visibilidad según rol: 4/3 = todos; 2 = por IdGrupo; 1 = por IdCapturista.
   * CapturistaVisita se usa como filtro (INNER JOIN) en roles 1/2 y se carga
   * por lote (visita más reciente) para enriquecer la respuesta.
   * Licencias se carga por lote (sin alterar el conteo de paginación).
   */
  async findAllPaginated(
    query: GetRegistrosQueryDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponseCommon> {
    try {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const skip = (page - 1) * limit;

      const queryBuilder = this.createRegistrosListQuery();
      this.applyRegistroVisibilityByRole(queryBuilder, user);

      queryBuilder
        .orderBy('registro.fechaCreacion', 'DESC')
        .addOrderBy('registro.id', 'DESC')
        .skip(skip)
        .take(limit);

      const [registros, total] = await queryBuilder.getManyAndCount();
      const idsRegistro = registros.map((registro) => Number(registro.id));
      const [licenciasByRegistroId, visitasByRegistroId, fotosByRegistroId] =
        await Promise.all([
          this.loadLicenciasByRegistroIds(idsRegistro),
          this.loadCapturistaVisitaFieldsByRegistroIds(idsRegistro),
          this.loadFotosListadoByRegistroIds(idsRegistro),
        ]);

      return {
        data: registros.map((registro) =>
          this.mapRegistroListItem(
            registro,
            licenciasByRegistroId.get(Number(registro.id)) ?? null,
            visitasByRegistroId.get(Number(registro.id)) ??
            this.buildNullCapturistaVisitaFields(),
            fotosByRegistroId.get(Number(registro.id)) ?? [],
          ),
        ),
        paginated: {
          total,
          page,
          lastPage: total === 0 ? 0 : Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al obtener los registros',
      );
    }
  }

  /**
   * Listado (sin paginación) filtrado por FechaCreacion inclusiva
   * [fechaInicio 00:00:00, día siguiente a fechaFin 00:00:00).
   * Misma visibilidad por rol que findAllPaginated.
   * Respuesta: arreglo directo (sin wrapper data).
   */
  async findByDateRange(
    dto: GetRegistrosByDateRangeDto,
    user: AuthenticatedUser,
  ): Promise<RegistroListadoItemDto[]> {
    try {
      if (dto.fechaInicio > dto.fechaFin) {
        throw new BadRequestException(
          'La fecha inicial no puede ser mayor que la fecha final.',
        );
      }

      const startDate = buildStartDateLocal(dto.fechaInicio);
      const endExclusive = buildEndExclusiveDateLocal(dto.fechaFin);

      const queryBuilder = this.createRegistrosListQuery()
        .andWhere('registro.fechaCreacion >= :startDate', { startDate })
        .andWhere('registro.fechaCreacion < :endExclusive', { endExclusive });

      this.applyRegistroVisibilityByRole(queryBuilder, user);

      queryBuilder
        .orderBy('registro.fechaCreacion', 'DESC')
        .addOrderBy('registro.id', 'DESC');

      const registros = await queryBuilder.getMany();
      const idsRegistro = registros.map((registro) => Number(registro.id));
      const [licenciasByRegistroId, visitasByRegistroId, fotosByRegistroId] =
        await Promise.all([
          this.loadLicenciasByRegistroIds(idsRegistro),
          this.loadCapturistaVisitaFieldsByRegistroIds(idsRegistro),
          this.loadFotosListadoByRegistroIds(idsRegistro),
        ]);

      return registros.map((registro) =>
        this.mapRegistroListItem(
          registro,
          licenciasByRegistroId.get(Number(registro.id)) ?? null,
          visitasByRegistroId.get(Number(registro.id)) ??
          this.buildNullCapturistaVisitaFields(),
          fotosByRegistroId.get(Number(registro.id)) ?? [],
        ),
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al obtener los registros por rango de fechas',
      );
    }
  }

  private createRegistrosListQuery(): SelectQueryBuilder<Registros> {
    return this.dataSource
      .getRepository(Registros)
      .createQueryBuilder('registro')
      .select([
        'registro.id',
        'registro.registro',
        'registro.latitud',
        'registro.longitud',
        'registro.entidadFederativa',
        'registro.municipio',
        'registro.localidad',
        'registro.colonia',
        'registro.calle',
        'registro.noInterior',
        'registro.noExterior',
        'registro.cp',
        'registro.tipoRegistro',
        'registro.predioObra',
        'registro.estatus',
        'registro.fechaCreacion',
        'registro.fechaActualizacion',
      ]);
  }

  /**
   * Filtros de visibilidad compartidos (GET paginado y POST por rango).
   * CapturistaVisita solo como INNER JOIN de filtro; no se selecciona.
   */
  private applyRegistroVisibilityByRole(
    queryBuilder: SelectQueryBuilder<Registros>,
    user: AuthenticatedUser,
  ): void {
    const idRol = Number(user.rol);
    const idUsuario = user.userId;
    const idGrupo = user.idGrupo;

    switch (idRol) {
      case 4:
      case 3:
        break;

      case 2:
        if (
          idGrupo === undefined ||
          idGrupo === null ||
          String(idGrupo).trim() === ''
        ) {
          throw new ForbiddenException(
            'El usuario supervisor no tiene un grupo asignado.',
          );
        }

        queryBuilder
          .innerJoin(
            CapturistaVisita,
            'capturistaVisita',
            'capturistaVisita.idRegistro = registro.id',
          )
          .andWhere('capturistaVisita.idGrupo = :idGrupo', { idGrupo })
          .distinct(true);
        break;

      case 1:
        if (
          idUsuario === undefined ||
          idUsuario === null ||
          String(idUsuario).trim() === ''
        ) {
          throw new ForbiddenException(
            'No fue posible identificar al usuario autenticado.',
          );
        }

        queryBuilder
          .innerJoin(
            CapturistaVisita,
            'capturistaVisita',
            'capturistaVisita.idRegistro = registro.id',
          )
          .andWhere('capturistaVisita.idCapturista = :idUsuario', {
            idUsuario,
          })
          .distinct(true);
        break;

      default:
        throw new ForbiddenException(
          'No tienes permisos para consultar los registros.',
        );
    }
  }

  /**
   * Carga Licencias de los registros visibles en una sola consulta.
   * Si hay más de una fila por IdRegistro, conserva la de Id más alto.
   */
  private async loadLicenciasByRegistroIds(
    idsRegistro: number[],
  ): Promise<Map<number, Licencias>> {
    const map = new Map<number, Licencias>();
    if (idsRegistro.length === 0) {
      return map;
    }

    const licencias = await this.dataSource
      .getRepository(Licencias)
      .createQueryBuilder('licencias')
      .where('licencias.idRegistro IN (:...idsRegistro)', { idsRegistro })
      .orderBy('licencias.id', 'DESC')
      .getMany();

    for (const licencia of licencias) {
      if (licencia.idRegistro == null) {
        continue;
      }
      const idRegistro = Number(licencia.idRegistro);
      if (!map.has(idRegistro)) {
        map.set(idRegistro, licencia);
      }
    }

    return map;
  }

  /**
   * Carga la visita más reciente por registro y resuelve nombres de Usuarios.
   * Orden: FechaHora DESC, Id DESC. Sin N+1.
   */
  private async loadCapturistaVisitaFieldsByRegistroIds(
    idsRegistro: number[],
  ): Promise<Map<number, CapturistaVisitaFlatFields>> {
    const result = new Map<number, CapturistaVisitaFlatFields>();
    if (idsRegistro.length === 0) {
      return result;
    }

    const visitas = await this.dataSource
      .getRepository(CapturistaVisita)
      .createQueryBuilder('capturistaVisita')
      .where('capturistaVisita.idRegistro IN (:...idsRegistro)', {
        idsRegistro,
      })
      .orderBy('capturistaVisita.fechaHora', 'DESC')
      .addOrderBy('capturistaVisita.id', 'DESC')
      .getMany();

    const visitaByRegistroId = new Map<number, CapturistaVisita>();
    for (const visita of visitas) {
      if (visita.idRegistro == null) {
        continue;
      }
      const idRegistro = Number(visita.idRegistro);
      if (!visitaByRegistroId.has(idRegistro)) {
        visitaByRegistroId.set(idRegistro, visita);
      }
    }

    const idsUsuario = new Set<number>();
    for (const visita of visitaByRegistroId.values()) {
      if (visita.idCapturista != null) {
        idsUsuario.add(Number(visita.idCapturista));
      }
      if (visita.idSupervisor != null) {
        idsUsuario.add(Number(visita.idSupervisor));
      }
    }

    const usuariosById = await this.loadUsuariosNombreByIds([...idsUsuario]);

    const idsGrupo = new Set<number>();
    for (const usuario of usuariosById.values()) {
      if (usuario.idGrupo != null) {
        idsGrupo.add(Number(usuario.idGrupo));
      }
    }
    const gruposById = await this.loadGruposNombreByIds([...idsGrupo]);

    for (const [idRegistro, visita] of visitaByRegistroId) {
      result.set(
        idRegistro,
        this.mapCapturistaVisitaFields(visita, usuariosById, gruposById),
      );
    }

    return result;
  }

  private async loadUsuariosNombreByIds(
    idsUsuario: number[],
  ): Promise<Map<number, UsuarioNombre>> {
    const map = new Map<number, UsuarioNombre>();
    if (idsUsuario.length === 0) {
      return map;
    }

    const usuarios = await this.dataSource.getRepository(Usuarios).find({
      where: { id: In(idsUsuario) },
      select: ['id', 'nombre', 'apellidoPaterno', 'apellidoMaterno', 'idGrupo'],
    });

    for (const usuario of usuarios) {
      map.set(Number(usuario.id), usuario);
    }

    return map;
  }

  private async loadGruposNombreByIds(
    idsGrupo: number[],
  ): Promise<Map<number, GrupoNombre>> {
    const map = new Map<number, GrupoNombre>();
    if (idsGrupo.length === 0) {
      return map;
    }

    const grupos = await this.dataSource.getRepository(Grupos).find({
      where: { id: In(idsGrupo) },
      select: ['id', 'nombre'],
    });

    for (const grupo of grupos) {
      map.set(Number(grupo.id), grupo);
    }

    return map;
  }

  /**
   * Fotos tipos 6/7/8 por lote. Orden: IdTipoFoto, FechaHora, Id ASC.
   */
  private async loadFotosListadoByRegistroIds(
    idsRegistro: number[],
  ): Promise<Map<number, RegistroFotoResponseDto[]>> {
    const map = new Map<number, RegistroFotoResponseDto[]>();
    if (idsRegistro.length === 0) {
      return map;
    }

    const fotos = await this.dataSource
      .getRepository(Fotos)
      .createQueryBuilder('foto')
      .select([
        'foto.id',
        'foto.idRegistro',
        'foto.ruta',
        'foto.fechaHora',
        'foto.idTipoFoto',
      ])
      .where('foto.idRegistro IN (:...idsRegistro)', { idsRegistro })
      .andWhere('foto.idTipoFoto IN (:...tiposFoto)', {
        tiposFoto: [...FOTOS_TIPOS_LISTADO],
      })
      .orderBy('foto.idTipoFoto', 'ASC')
      .addOrderBy('foto.fechaHora', 'ASC')
      .addOrderBy('foto.id', 'ASC')
      .getMany();

    for (const foto of fotos) {
      if (foto.idRegistro == null || foto.idTipoFoto == null) {
        continue;
      }
      const idRegistro = Number(foto.idRegistro);
      const idFoto = Number(foto.id);
      const listado = map.get(idRegistro) ?? [];
      if (listado.some((item) => item.id === idFoto)) {
        continue;
      }
      listado.push({
        id: idFoto,
        idRegistro,
        ruta: foto.ruta ?? null,
        fechaHora: foto.fechaHora ?? null,
        idTipoFoto: Number(foto.idTipoFoto),
      });
      map.set(idRegistro, listado);
    }

    return map;
  }

  private mapCapturistaVisitaFields(
    visita: CapturistaVisita,
    usuariosById: Map<number, UsuarioNombre>,
    gruposById: Map<number, GrupoNombre>,
  ): CapturistaVisitaFlatFields {
    const idCapturista =
      visita.idCapturista != null ? Number(visita.idCapturista) : null;
    const idSupervisor =
      visita.idSupervisor != null ? Number(visita.idSupervisor) : null;

    const capturista =
      idCapturista != null ? (usuariosById.get(idCapturista) ?? null) : null;
    const supervisor =
      idSupervisor != null ? (usuariosById.get(idSupervisor) ?? null) : null;

    const nombreCapturista = capturista?.nombre ?? null;
    const apellidoPaternoCapturista = capturista?.apellidoPaterno ?? null;
    const apellidoMaternoCapturista = capturista?.apellidoMaterno ?? null;

    const nombreSupervisor = supervisor?.nombre ?? null;
    const apellidoPaternoSupervisor = supervisor?.apellidoPaterno ?? null;
    const apellidoMaternoSupervisor = supervisor?.apellidoMaterno ?? null;

    const idGrupoCapturista =
      capturista?.idGrupo != null ? Number(capturista.idGrupo) : null;
    const idGrupoSupervisor =
      supervisor?.idGrupo != null ? Number(supervisor.idGrupo) : null;

    const grupoCapturista =
      idGrupoCapturista != null
        ? (gruposById.get(idGrupoCapturista) ?? null)
        : null;
    const grupoSupervisor =
      idGrupoSupervisor != null
        ? (gruposById.get(idGrupoSupervisor) ?? null)
        : null;

    return {
      idCapturistaVisita: Number(visita.id),
      idRegistroCapturistaVisita:
        visita.idRegistro != null ? Number(visita.idRegistro) : null,
      idCapturista,
      nombreCapturista,
      apellidoPaternoCapturista,
      apellidoMaternoCapturista,
      nombreCompletoCapturista: this.buildFullName(
        nombreCapturista,
        apellidoPaternoCapturista,
        apellidoMaternoCapturista,
      ),
      idGrupoCapturista,
      nombreGrupoCapturista: grupoCapturista?.nombre ?? null,
      idSupervisor,
      nombreSupervisor,
      apellidoPaternoSupervisor,
      apellidoMaternoSupervisor,
      nombreCompletoSupervisor: this.buildFullName(
        nombreSupervisor,
        apellidoPaternoSupervisor,
        apellidoMaternoSupervisor,
      ),
      idGrupoSupervisor,
      nombreGrupoSupervisor: grupoSupervisor?.nombre ?? null,
      idGrupoCapturistaVisita:
        visita.idGrupo != null ? Number(visita.idGrupo) : null,
      fechaHoraCapturistaVisita: visita.fechaHora ?? null,
    };
  }

  private buildNullCapturistaVisitaFields(): CapturistaVisitaFlatFields {
    return {
      idCapturistaVisita: null,
      idRegistroCapturistaVisita: null,
      idCapturista: null,
      nombreCapturista: null,
      apellidoPaternoCapturista: null,
      apellidoMaternoCapturista: null,
      nombreCompletoCapturista: null,
      idGrupoCapturista: null,
      nombreGrupoCapturista: null,
      idSupervisor: null,
      nombreSupervisor: null,
      apellidoPaternoSupervisor: null,
      apellidoMaternoSupervisor: null,
      nombreCompletoSupervisor: null,
      idGrupoSupervisor: null,
      nombreGrupoSupervisor: null,
      idGrupoCapturistaVisita: null,
      fechaHoraCapturistaVisita: null,
    };
  }

  private buildFullName(
    nombre?: string | null,
    apellidoPaterno?: string | null,
    apellidoMaterno?: string | null,
  ): string | null {
    const partes = [nombre, apellidoPaterno, apellidoMaterno]
      .filter(
        (valor) =>
          valor !== null &&
          valor !== undefined &&
          String(valor).trim() !== '',
      )
      .map((valor) => String(valor).trim());

    return partes.length > 0 ? partes.join(' ') : null;
  }

  private mapRegistroListItem(
    registro: Registros,
    licencia: Licencias | null,
    visitaFields: CapturistaVisitaFlatFields,
    fotos: RegistroFotoResponseDto[],
  ): RegistroListadoItemDto {
    return {
      id: Number(registro.id),
      registro: registro.registro ?? null,
      latitud: registro.latitud ?? null,
      longitud: registro.longitud ?? null,
      entidadFederativa: registro.entidadFederativa ?? null,
      municipio: registro.municipio ?? null,
      localidad: registro.localidad ?? null,
      colonia: registro.colonia ?? null,
      calle: registro.calle ?? null,
      noInterior: registro.noInterior ?? null,
      noExterior: registro.noExterior ?? null,
      cp: registro.cp ?? null,
      tipoRegistro: registro.tipoRegistro ?? null,
      predioObra: registro.predioObra ?? null,
      estatus: registro.estatus ?? null,
      fechaCreacion: registro.fechaCreacion ?? null,
      fechaActualizacion: registro.fechaActualizacion ?? null,

      idLicencia: licencia != null ? Number(licencia.id) : null,
      idRegistroLicencia:
        licencia?.idRegistro != null ? Number(licencia.idRegistro) : null,
      registroLicencia: licencia?.registro ?? null,
      nombreComercial: licencia?.nombreComercial ?? null,
      giro: licencia?.giro ?? null,
      licenciaSuelo: licencia?.licenciaSuelo ?? null,
      nombrePropietario: licencia?.nombrePropietario ?? null,
      apellidoPaternoPropietario:
        licencia?.apellidoPaternoPropietario ?? null,
      apellidoMaternoPropietario:
        licencia?.apellidoMaternoPropietario ?? null,
      tipoPersona: licencia?.tipoPersona ?? null,
      rfc: licencia?.rfc ?? null,
      fechaExpedicion: licencia?.fechaExpedicion ?? null,
      fechaRefrendo: licencia?.fechaRefrendo ?? null,
      estacionamiento: licencia?.estacionamiento ?? null,
      tipoLicencia: licencia?.tipo ?? null,
      fechaHoraLicencia: licencia?.fechaHora ?? null,
      fechaCreacionLicencia: licencia?.fechaCreacion ?? null,
      fechaActualizacionLicencia: licencia?.fechaActualizacion ?? null,

      idCapturistaVisita: visitaFields.idCapturistaVisita,
      idRegistroCapturistaVisita: visitaFields.idRegistroCapturistaVisita,
      idGrupoCapturistaVisita: visitaFields.idGrupoCapturistaVisita,
      fechaHoraCapturistaVisita: visitaFields.fechaHoraCapturistaVisita,

      idCapturista: visitaFields.idCapturista,
      nombreCapturista: visitaFields.nombreCapturista,
      apellidoPaternoCapturista: visitaFields.apellidoPaternoCapturista,
      apellidoMaternoCapturista: visitaFields.apellidoMaternoCapturista,
      nombreCompletoCapturista: visitaFields.nombreCompletoCapturista,
      idGrupoCapturista: visitaFields.idGrupoCapturista,
      nombreGrupoCapturista: visitaFields.nombreGrupoCapturista,

      idSupervisor: visitaFields.idSupervisor,
      nombreSupervisor: visitaFields.nombreSupervisor,
      apellidoPaternoSupervisor: visitaFields.apellidoPaternoSupervisor,
      apellidoMaternoSupervisor: visitaFields.apellidoMaternoSupervisor,
      nombreCompletoSupervisor: visitaFields.nombreCompletoSupervisor,
      idGrupoSupervisor: visitaFields.idGrupoSupervisor,
      nombreGrupoSupervisor: visitaFields.nombreGrupoSupervisor,

      fotos,
    };
  }

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

    this.storageService.assertValidLcFiles(parsed.archivosLc);
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
    await this.assertLcFileTipoFotoCatalog(parsed.archivosLc);
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
      parsed.archivosLc,
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
    archivosLc: LcFiles,
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
    const hasArchivosLc = LC_FILE_KEYS.some((key) => archivosLc[key]);
    const hasFotosSapac = Object.keys(fotosSapac).length > 0;
    const hasFotosCatastro = Object.keys(fotosCatastro).length > 0;
    const hasFotosLicencias = Object.keys(fotosLicencias).length > 0;
    const hasFotosProteccionCivil =
      Object.keys(fotosProteccionCivil).length > 0;
    const predioObraCero =
      crearSapac || crearCatastro || crearLicencia || crearProteccionCivil;

    if (predioObraCero && hasArchivosLc) {
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
    // fachada/estacionamiento/bodega son transversales (Fotos 6/7/8 en ambos
    // flujos); solo licenciaFuncionamiento sigue restringido a PredioObra = 0.
    const hasFotosLicenciasNoTransversales = (
      Object.keys(fotosLicencias) as LicenciasFotoKey[]
    ).some(
      (key) => fotosLicencias[key] && !LICENCIAS_TRANSVERSAL_FOTO_KEYS.has(key),
    );
    if (!crearLicencia && hasFotosLicenciasNoTransversales) {
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
        // Las fotos de Licencias son transversales: con PredioObra = 1 solo
        // llegan fachada/estacionamiento/bodega (la sanitización descarta el resto).
        if (
          crearSapac ||
          crearCatastro ||
          crearLicencia ||
          crearProteccionCivil ||
          hasFotosLicencias
        ) {
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

        if (hasArchivosLc) {
          if (idLicenciaConstruccion == null) {
            throw new BadRequestException(
              'No se pueden registrar archivos de LicenciaConstruccion cuando PredioObra es 0.',
            );
          }

          const fotosResultado: FotoLicenciaResultado[] = [];
          const ahora = new Date();

          // Un campo → un archivo → un IdTipoFoto → una fila.
          const { saved, absoluteCreated } =
            await this.storageService.saveLcFiles(idRegistro, archivosLc);
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

  private async assertLcFileTipoFotoCatalog(files: LcFiles): Promise<void> {
    const requiredIds = LC_FILE_KEYS.filter((key) => files[key]).map(
      (key) => LC_FILE_TIPO_FOTO[key],
    );

    if (!requiredIds.length) return;

    const unique = [...new Set(requiredIds)];
    const found = await this.dataSource.getRepository(TipoFoto).find({
      where: { id: In(unique) },
      select: ['id'],
    });
    const foundIds = new Set(found.map((tipo) => Number(tipo.id)));

    for (const id of unique) {
      if (foundIds.has(id)) continue;
      const key = LC_FILE_KEYS.find((item) => LC_FILE_TIPO_FOTO[item] === id);
      throw new BadRequestException(
        `El TipoFoto ${id} requerido para ${
          key ? LC_FILE_FIELD_NAMES[key] : 'el archivo de LicenciaConstruccion'
        } no existe.`,
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

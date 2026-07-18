import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
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
import { Usuarios } from 'src/entities/Usuarios';
import { CATASTRO_TIPO_FOTO } from 'src/registros/catastro.constants';
import {
  LC_RESPONSE_PHOTO_KEYS,
  LC_RESPONSE_PHOTO_MAP,
  LcResponsePhotoKey,
} from 'src/registros/licencia-construccion.constants';
import { LICENCIAS_TIPO_FOTO } from 'src/registros/licencias.constants';
import { PROTECCION_CIVIL_TIPO_FOTO } from 'src/registros/proteccion-civil.constants';
import { SAPAC_TIPO_FOTO } from 'src/registros/sapac.constants';
import { MonitoreoListadoItemDto } from './dto/monitoreo-listado-item.dto';

/** Fotos de fachada/estacionamiento/bodega en listados y detalle plano. */
const FOTOS_TIPOS_LISTADO = [
  LICENCIAS_TIPO_FOTO.fachada,
  LICENCIAS_TIPO_FOTO.estacionamiento,
  LICENCIAS_TIPO_FOTO.bodega,
] as const;

type FotoRow = { id: number; idTipoFoto: number | null; ruta: string | null };

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

@Injectable()
export class MonitoreoService {
  constructor(
    @InjectRepository(Registros)
    private readonly registrosRepository: Repository<Registros>,
    @InjectRepository(CapturistaVisita)
    private readonly capturistaVisitaRepository: Repository<CapturistaVisita>,
    @InjectRepository(Usuarios)
    private readonly usuariosRepository: Repository<Usuarios>,
    @InjectRepository(Grupos)
    private readonly gruposRepository: Repository<Grupos>,
    @InjectRepository(Sapac)
    private readonly sapacRepository: Repository<Sapac>,
    @InjectRepository(Catastro)
    private readonly catastroRepository: Repository<Catastro>,
    @InjectRepository(Licencias)
    private readonly licenciasRepository: Repository<Licencias>,
    @InjectRepository(Contactos)
    private readonly contactosRepository: Repository<Contactos>,
    @InjectRepository(ProteccionCivil)
    private readonly proteccionCivilRepository: Repository<ProteccionCivil>,
    @InjectRepository(ContactoRepresentante)
    private readonly contactoRepresentanteRepository: Repository<ContactoRepresentante>,
    @InjectRepository(Fotos)
    private readonly fotosRepository: Repository<Fotos>,
    @InjectRepository(LicenciaConstruccion)
    private readonly licenciaConstruccionRepository: Repository<LicenciaConstruccion>,
    @InjectRepository(Corresponsables)
    private readonly corresponsablesRepository: Repository<Corresponsables>,
    @InjectRepository(FotosLicenciaConstruccion)
    private readonly fotosLicenciaConstruccionRepository: Repository<FotosLicenciaConstruccion>,
  ) { }

  /**
   * Listado completo de Registros + Licencias (plano, sin paginación ni fechas).
   * Visibilidad: 4/3 = todos; 2 = IdGrupo; 1 = IdCapturista.
   * Respuesta: arreglo directo (sin wrapper data).
   */
  async findAll(user: AuthenticatedUser): Promise<MonitoreoListadoItemDto[]> {
    try {
      const idRol = Number(user.rol);
      const idUsuario = user.userId;
      const idGrupo = user.idGrupo;

      const queryBuilder = this.registrosRepository
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
            'No tienes permisos para consultar el monitoreo.',
          );
      }

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
        this.mapListItem(
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
        'Error al obtener el monitoreo',
      );
    }
  }

  /**
   * Carga Licencias de todos los registros visibles en una sola consulta.
   * Si hay más de una fila por IdRegistro, conserva la de Id más alto.
   */
  private async loadLicenciasByRegistroIds(
    idsRegistro: number[],
  ): Promise<Map<number, Licencias>> {
    const map = new Map<number, Licencias>();
    if (idsRegistro.length === 0) {
      return map;
    }

    const licencias = await this.licenciasRepository
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
   * Detalle completo de un registro con visibilidad según rol.
   * Registro y relaciones existentes + campos planos de CapturistaVisita/Usuarios.
   */
  async findOne(
    idRegistro: number,
    user: AuthenticatedUser,
  ): Promise<{ data: Record<string, unknown> }> {
    try {
      if (!Number.isInteger(idRegistro) || idRegistro < 1) {
        throw new BadRequestException(
          'El identificador del registro no es válido.',
        );
      }

      const registro = await this.registrosRepository.findOne({
        where: { id: idRegistro },
      });

      if (!registro) {
        throw new NotFoundException('El registro solicitado no existe.');
      }

      await this.assertRegistroVisibleByRole(idRegistro, user);

      const [visitaFields, fotosByRegistroId] = await Promise.all([
        this.loadCapturistaVisitaDetailFields(idRegistro),
        this.loadFotosListadoByRegistroIds([idRegistro]),
      ]);

      const base = this.mapRegistroDetailWithRelations(
        registro,
        visitaFields,
        fotosByRegistroId.get(idRegistro) ?? [],
      );

      if (Number(registro.predioObra) === 0) {
        return {
          data: {
            ...base,
            ...(await this.buildPredioDetail(idRegistro)),
          },
        };
      }

      if (Number(registro.predioObra) === 1) {
        return {
          data: {
            ...base,
            ...(await this.buildConstructionDetail(idRegistro)),
          },
        };
      }

      return { data: base };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al obtener el detalle del registro',
      );
    }
  }

  private async assertRegistroVisibleByRole(
    idRegistro: number,
    user: AuthenticatedUser,
  ): Promise<void> {
    const idRol = Number(user.rol);
    const idUsuario = user.userId;
    const idGrupo = user.idGrupo;

    switch (idRol) {
      case 4:
      case 3:
        return;

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

        if (
          !(await this.capturistaVisitaRepository.findOne({
            where: { idRegistro, idGrupo },
          }))
        ) {
          throw new ForbiddenException(
            'No tienes permisos para consultar el monitoreo.',
          );
        }
        return;

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

        if (
          !(await this.capturistaVisitaRepository.findOne({
            where: { idRegistro, idCapturista: idUsuario },
          }))
        ) {
          throw new ForbiddenException(
            'No tienes permisos para consultar el monitoreo.',
          );
        }
        return;

      default:
        throw new ForbiddenException(
          'No tienes permisos para consultar el monitoreo.',
        );
    }
  }

  /**
   * Visita más reciente + nombres de capturista/supervisor para un registro.
   */
  private async loadCapturistaVisitaDetailFields(
    idRegistro: number,
  ): Promise<CapturistaVisitaFlatFields> {
    const map = await this.loadCapturistaVisitaFieldsByRegistroIds([
      idRegistro,
    ]);
    return map.get(idRegistro) ?? this.buildNullCapturistaVisitaFields();
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

    const visitas = await this.capturistaVisitaRepository
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

    const usuarios = await this.usuariosRepository.find({
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

    const grupos = await this.gruposRepository.find({
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

    const fotos = await this.fotosRepository
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
      nombreCompletoCapturista: this.buildNombreCompleto(
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
      nombreCompletoSupervisor: this.buildNombreCompleto(
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

  private buildNombreCompleto(
    nombre: string | null | undefined,
    apellidoPaterno: string | null | undefined,
    apellidoMaterno: string | null | undefined,
  ): string | null {
    const partes = [nombre, apellidoPaterno, apellidoMaterno].filter(
      (valor) =>
        valor !== null &&
        valor !== undefined &&
        String(valor).trim() !== '',
    );
    if (partes.length === 0) {
      return null;
    }
    return partes.map((valor) => String(valor).trim()).join(' ');
  }

  private async buildPredioDetail(idRegistro: number) {
    const [
      sapac,
      catastro,
      licencias,
      contacto,
      proteccionCivil,
      contactoRepresentante,
      fotos,
    ] = await Promise.all([
      this.sapacRepository.findOne({
        where: { idRegistro },
        order: { id: 'DESC' },
      }),
      this.catastroRepository.findOne({
        where: { idRegistro },
        order: { id: 'DESC' },
      }),
      this.licenciasRepository.findOne({
        where: { idRegistro },
        order: { id: 'DESC' },
      }),
      this.contactosRepository.findOne({
        where: { idRegistro },
        order: { id: 'DESC' },
      }),
      this.proteccionCivilRepository.findOne({
        where: { idRegistro },
        order: { id: 'DESC' },
      }),
      this.contactoRepresentanteRepository.findOne({
        where: { idRegistro },
        order: { id: 'DESC' },
      }),
      this.fotosRepository.find({
        where: { idRegistro },
        order: { idTipoFoto: 'ASC', id: 'DESC' },
      }),
    ]);

    const fotosByTipo = this.groupFotosByTipo(fotos);

    return {
      Sapac: this.mapSapac(sapac, fotosByTipo),
      Catastro: this.mapCatastro(catastro, fotosByTipo),
      Licencias: this.mapLicencias(licencias, contacto, fotosByTipo),
      ProteccionCivil: this.mapProteccionCivil(
        proteccionCivil,
        contactoRepresentante,
        fotosByTipo,
      ),
    };
  }

  private async buildConstructionDetail(idRegistro: number) {
    const licenciaConstruccion =
      await this.licenciaConstruccionRepository.findOne({
        where: { idRegistro },
        order: { id: 'DESC' },
      });

    if (!licenciaConstruccion) {
      return { LicenciaConstruccion: null };
    }

    const idLicenciaConstruccion = Number(licenciaConstruccion.id);

    const [corresponsables, fotosLc] = await Promise.all([
      this.corresponsablesRepository.find({
        where: { idLicenciaConstruccion },
        order: { id: 'ASC' },
      }),
      this.fotosLicenciaConstruccionRepository.find({
        where: { idLicenciaConstruccion },
        order: { idTipoFoto: 'ASC', id: 'DESC' },
      }),
    ]);

    const fotosByTipo = this.groupFotosByTipo(fotosLc);

    return {
      LicenciaConstruccion: {
        ...this.mapLicenciaConstruccionScalars(licenciaConstruccion),
        Corresponsables: corresponsables.map((item) => ({
          Id: Number(item.id),
          NombreCompleto: item.nombreCompleto ?? null,
          NoRegLicenciaConstruccion: item.noRegLicenciaConstruccion ?? null,
          CedulaProfesional: item.cedulaProfesional ?? null,
        })),
        ...this.mapLcFotos(fotosByTipo),
      },
    };
  }

  private groupFotosByTipo(
    fotos: Array<{
      id: number;
      idTipoFoto: number | null;
      ruta: string | null;
    }>,
  ): Map<number, FotoRow[]> {
    const map = new Map<number, FotoRow[]>();
    for (const foto of fotos) {
      if (foto.idTipoFoto == null) continue;
      const list = map.get(foto.idTipoFoto) ?? [];
      list.push({
        id: Number(foto.id),
        idTipoFoto: foto.idTipoFoto,
        ruta: foto.ruta,
      });
      map.set(foto.idTipoFoto, list);
    }
    return map;
  }

  /**
   * Archivo único por tipo, o null si no existe.
   * Ante duplicados históricos toma la fila de Id mayor (las consultas de
   * fotos ordenan Id DESC dentro de cada tipo); no se modifica la BD.
   */
  private singleFotoUrl(
    fotosByTipo: Map<number, FotoRow[]>,
    idTipoFoto: number,
  ): string | null {
    const rows = fotosByTipo.get(idTipoFoto);
    if (!rows?.length) return null;
    return rows[0].ruta ?? null;
  }

  private mapRegistroDetail(registro: Registros) {
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
    };
  }

  /**
   * Detalle plano: Registros + visita/capturista/supervisor/grupos + fotos.
   * Cada clave se declara una sola vez (sin spread de entidades).
   */
  private mapRegistroDetailWithRelations(
    registro: Registros,
    visitaFields: CapturistaVisitaFlatFields,
    fotos: RegistroFotoResponseDto[],
  ) {
    const base = this.mapRegistroDetail(registro);
    return {
      id: base.id,
      registro: base.registro,
      latitud: base.latitud,
      longitud: base.longitud,
      entidadFederativa: base.entidadFederativa,
      municipio: base.municipio,
      localidad: base.localidad,
      colonia: base.colonia,
      calle: base.calle,
      noInterior: base.noInterior,
      noExterior: base.noExterior,
      cp: base.cp,
      tipoRegistro: base.tipoRegistro,
      predioObra: base.predioObra,
      estatus: base.estatus,
      fechaCreacion: base.fechaCreacion,
      fechaActualizacion: base.fechaActualizacion,

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

  private mapSapac(
    sapac: Sapac | null,
    fotosByTipo: Map<number, FotoRow[]>,
  ) {
    const photos = {
      reciboSapac: this.singleFotoUrl(fotosByTipo, SAPAC_TIPO_FOTO.reciboSapac),
      caratulamedidor: this.singleFotoUrl(
        fotosByTipo,
        SAPAC_TIPO_FOTO.caratulamedidor,
      ),
      cuadromedidor: this.singleFotoUrl(
        fotosByTipo,
        SAPAC_TIPO_FOTO.cuadromedidor,
      ),
    };

    if (!sapac && !Object.values(photos).some((v) => v != null)) {
      return null;
    }

    return {
      Id: sapac != null ? Number(sapac.id) : null,
      NumeroCuenta: sapac?.numeroCuenta ?? null,
      Nombre: sapac?.nombre ?? null,
      ApellidoPaterno: sapac?.apellidoPaterno ?? null,
      ApellidoMaterno: sapac?.apellidoMaterno ?? null,
      RFC: sapac?.rfc ?? null,
      Sector: sapac?.sector ?? null,
      Ruta: sapac?.ruta ?? null,
      Folio: sapac?.folio ?? null,
      IdTipoServicio: sapac?.idTipoServicio ?? null,
      Medidor: sapac?.medidor ?? null,
      ...photos,
    };
  }

  private mapCatastro(
    catastro: Catastro | null,
    fotosByTipo: Map<number, FotoRow[]>,
  ) {
    const reciboPredial = this.singleFotoUrl(
      fotosByTipo,
      CATASTRO_TIPO_FOTO.reciboPredial,
    );

    if (!catastro && reciboPredial == null) {
      return null;
    }

    return {
      Id: catastro != null ? Number(catastro.id) : null,
      Clave: catastro?.clave ?? null,
      M2: catastro?.m2 ?? null,
      Superficie: catastro?.superficie ?? null,
      UsoSuelo: catastro?.usoSuelo ?? null,
      reciboPredial,
    };
  }

  private mapLicencias(
    licencias: Licencias | null,
    contacto: Contactos | null,
    fotosByTipo: Map<number, FotoRow[]>,
  ) {
    const photos = {
      licenciaFuncionamiento: this.singleFotoUrl(
        fotosByTipo,
        LICENCIAS_TIPO_FOTO.licenciaFuncionamiento,
      ),
      fachada: this.singleFotoUrl(fotosByTipo, LICENCIAS_TIPO_FOTO.fachada),
      estacionamiento: this.singleFotoUrl(
        fotosByTipo,
        LICENCIAS_TIPO_FOTO.estacionamiento,
      ),
      bodega: this.singleFotoUrl(fotosByTipo, LICENCIAS_TIPO_FOTO.bodega),
    };

    if (
      !licencias &&
      !contacto &&
      !Object.values(photos).some((v) => v != null)
    ) {
      return null;
    }

    return {
      Id: licencias != null ? Number(licencias.id) : null,
      Registro: licencias?.registro ?? null,
      NombreComercial: licencias?.nombreComercial ?? null,
      Giro: licencias?.giro ?? null,
      LicenciaSuelo: licencias?.licenciaSuelo ?? null,
      NombrePropietario: licencias?.nombrePropietario ?? null,
      ApellidoPaternoPropietario:
        licencias?.apellidoPaternoPropietario ?? null,
      ApellidoMaternoPropietario:
        licencias?.apellidoMaternoPropietario ?? null,
      TipoPersona: licencias?.tipoPersona ?? null,
      RFC: licencias?.rfc ?? null,
      FechaExpedicion: licencias?.fechaExpedicion ?? null,
      FechaRefrendo: licencias?.fechaRefrendo ?? null,
      Estacionamiento: licencias?.estacionamiento ?? null,
      Tipo: licencias?.tipo ?? null,
      FechaHora: licencias?.fechaHora ?? null,
      Contacto: this.mapContacto(contacto),
      ...photos,
    };
  }

  private mapContacto(contacto: Contactos | null) {
    return {
      Id: contacto != null ? Number(contacto.id) : null,
      Nombre: contacto?.nombre ?? null,
      ApellidoPaterno: contacto?.apellidoPaterno ?? null,
      ApellidoMaterno: contacto?.apellidoMaterno ?? null,
      Telefono: contacto?.telefono ?? null,
      Correo: contacto?.correo ?? null,
    };
  }

  private mapProteccionCivil(
    pc: ProteccionCivil | null,
    representante: ContactoRepresentante | null,
    fotosByTipo: Map<number, FotoRow[]>,
  ) {
    const vistoBueno = this.singleFotoUrl(
      fotosByTipo,
      PROTECCION_CIVIL_TIPO_FOTO.vistoBueno,
    );

    if (!pc && !representante && vistoBueno == null) {
      return null;
    }

    return {
      Id: pc != null ? Number(pc.id) : null,
      EsEmpresa: pc?.esEmpresa ?? null,
      RazonSocial: pc?.razonSocial ?? null,
      RFC: pc?.rfc ?? null,
      Nombre: pc?.nombre ?? null,
      ApellidoPaterno: pc?.apellidoPaterno ?? null,
      ApellidoMaterno: pc?.apellidoMaterno ?? null,
      Telefono: pc?.telefono ?? null,
      RegistroAcreditacion: pc?.registroAcreditacion ?? null,
      TienePrograma: pc?.tienePrograma ?? null,
      ContactoRepresentante: this.mapContactoRepresentante(representante),
      vistoBueno,
    };
  }

  private mapContactoRepresentante(
    contacto: ContactoRepresentante | null,
  ) {
    return {
      Id: contacto != null ? Number(contacto.id) : null,
      Nombre: contacto?.nombre ?? null,
      ApellidoPaterno: contacto?.apellidoPaterno ?? null,
      ApellidoMaterno: contacto?.apellidoMaterno ?? null,
      Telefono: contacto?.telefono ?? null,
      Correo: contacto?.correo ?? null,
    };
  }

  private mapLicenciaConstruccionScalars(lc: LicenciaConstruccion) {
    return {
      Id: Number(lc.id),
      TipoSolicitudLicencia: lc.tipoSolicitudLicencia ?? null,
      DescripcionProyecto: lc.descripcionProyecto ?? null,
      SuperficieTerrenoM2: lc.superficieTerrenoM2 ?? null,
      SuperficieTerrenoObraM2: lc.superficieTerrenoObraM2 ?? null,
      DescripcionSistemaConstructivo:
        lc.descripcionSistemaConstructivo ?? null,
      NombrePropietario: lc.nombrePropietario ?? null,
      DomicilioNotificacion: lc.domicilioNotificacion ?? null,
      RFC: lc.rfc ?? null,
      NombreDRO: lc.nombreDRO ?? null,
      NoRegLicenciaConstruccion: lc.noRegLicenciaConstruccion ?? null,
      CedulaProfesional: lc.cedulaProfesional ?? null,
      Fecha: lc.fecha ?? null,
      NumeroExpediente: lc.numeroExpediente ?? null,
      NumeroControl: lc.numeroControl ?? null,
      SeguimientoObra: lc.seguimientoObra ?? null,
      ConstanciaAlineamiento: lc.constanciaAlineamiento ?? null,
      LicenciaUsoSuelo: lc.licenciaUsoSuelo ?? null,
      PlanoAutorizado: lc.planoAutorizado ?? null,
      LicenciaFraccionamiento: lc.licenciaFraccionamiento ?? null,
      Escrituras: lc.escrituras ?? null,
      FactibilidadAguaPotable: lc.factibilidadAguaPotable ?? null,
      RecibosPagoPredial: lc.recibosPagoPredial ?? null,
      RecibosMunicipales: lc.recibosMunicipales ?? null,
      PlanoArquitectonicos: lc.planoArquitectonicos ?? null,
      Otros: lc.otros ?? null,
    };
  }

  /**
   * Fotos nominales de LicenciaConstruccion (una URL o null por IdTipoFoto),
   * según LC_RESPONSE_PHOTO_MAP. Todas las propiedades siempre presentes.
   */
  private mapLcFotos(
    fotosByTipo: Map<number, FotoRow[]>,
  ): Record<LcResponsePhotoKey, string | null> {
    const result = {} as Record<LcResponsePhotoKey, string | null>;
    for (const key of LC_RESPONSE_PHOTO_KEYS) {
      result[key] = this.singleFotoUrl(
        fotosByTipo,
        LC_RESPONSE_PHOTO_MAP[key],
      );
    }
    return result;
  }

  private mapListItem(
    registro: Registros,
    licencia: Licencias | null,
    visitaFields: CapturistaVisitaFlatFields,
    fotos: RegistroFotoResponseDto[],
  ): MonitoreoListadoItemDto {
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
}

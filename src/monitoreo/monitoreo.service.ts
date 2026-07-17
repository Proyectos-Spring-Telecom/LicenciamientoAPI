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
import { CATASTRO_TIPO_FOTO } from 'src/registros/catastro.constants';
import {
  FIRMA_TIPO_FOTO,
  LICENCIA_CONSTRUCCION_DOCUMENTO_TIPO_FOTO,
} from 'src/registros/licencia-construccion.constants';
import { LICENCIAS_TIPO_FOTO } from 'src/registros/licencias.constants';
import { PROTECCION_CIVIL_TIPO_FOTO } from 'src/registros/proteccion-civil.constants';
import { SAPAC_TIPO_FOTO } from 'src/registros/sapac.constants';
import { MonitoreoListadoItemDto } from './dto/monitoreo-listado-item.dto';

type FotoRow = { id: number; idTipoFoto: number | null; ruta: string | null };

type CapturistaVisitaFlatFields = {
  idCapturistaVisita: number | null;
  idRegistroCapturistaVisita: number | null;
  idCapturista: number | null;
  nombreCapturista: string | null;
  apellidoPaternoCapturista: string | null;
  apellidoMaternoCapturista: string | null;
  nombreCompletoCapturista: string | null;
  idSupervisor: number | null;
  nombreSupervisor: string | null;
  apellidoPaternoSupervisor: string | null;
  apellidoMaternoSupervisor: string | null;
  nombreCompletoSupervisor: string | null;
  idGrupoCapturistaVisita: number | null;
  fechaHoraCapturistaVisita: Date | null;
};

type UsuarioNombre = Pick<
  Usuarios,
  'id' | 'nombre' | 'apellidoPaterno' | 'apellidoMaterno'
>;

@Injectable()
export class MonitoreoService {
  constructor(
    @InjectRepository(Registros)
    private readonly registrosRepository: Repository<Registros>,
    @InjectRepository(CapturistaVisita)
    private readonly capturistaVisitaRepository: Repository<CapturistaVisita>,
    @InjectRepository(Usuarios)
    private readonly usuariosRepository: Repository<Usuarios>,
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
      const [licenciasByRegistroId, visitasByRegistroId] = await Promise.all([
        this.loadLicenciasByRegistroIds(idsRegistro),
        this.loadCapturistaVisitaFieldsByRegistroIds(idsRegistro),
      ]);

      return registros.map((registro) =>
        this.mapListItem(
          registro,
          licenciasByRegistroId.get(Number(registro.id)) ?? null,
          visitasByRegistroId.get(Number(registro.id)) ??
            this.buildNullCapturistaVisitaFields(),
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

      const visitaFields = await this.loadCapturistaVisitaDetailFields(
        idRegistro,
      );

      const base = {
        ...this.mapRegistroDetail(registro),
        ...visitaFields,
      };

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

    for (const [idRegistro, visita] of visitaByRegistroId) {
      result.set(
        idRegistro,
        this.mapCapturistaVisitaFields(visita, usuariosById),
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
      select: ['id', 'nombre', 'apellidoPaterno', 'apellidoMaterno'],
    });

    for (const usuario of usuarios) {
      map.set(Number(usuario.id), usuario);
    }

    return map;
  }

  private mapCapturistaVisitaFields(
    visita: CapturistaVisita,
    usuariosById: Map<number, UsuarioNombre>,
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
      idSupervisor,
      nombreSupervisor,
      apellidoPaternoSupervisor,
      apellidoMaternoSupervisor,
      nombreCompletoSupervisor: this.buildNombreCompleto(
        nombreSupervisor,
        apellidoPaternoSupervisor,
        apellidoMaternoSupervisor,
      ),
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
      idSupervisor: null,
      nombreSupervisor: null,
      apellidoPaternoSupervisor: null,
      apellidoMaternoSupervisor: null,
      nombreCompletoSupervisor: null,
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
        order: { id: 'ASC' },
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
        order: { id: 'ASC' },
      }),
    ]);

    const fotosByTipo = this.groupFotosByTipo(fotosLc);

    return {
      LicenciaConstruccion: {
        ...this.mapLicenciaConstruccionScalars(licenciaConstruccion),
        Corresponsables: corresponsables.map((item) => ({
          Id: Number(item.id),
          NombreCompleto: item.nombreCompleto,
          NoRegLicenciaConstruccion: item.noRegLicenciaConstruccion,
          CedulaProfesional: item.cedulaProfesional,
        })),
        ...this.mapLcDocumentos(fotosByTipo),
        ...this.mapLcFirmas(fotosByTipo),
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

  /** Archivo único: primera ruta por Id ASC, o null. */
  private singleFotoUrl(
    fotosByTipo: Map<number, FotoRow[]>,
    idTipoFoto: number,
  ): string | null {
    const rows = fotosByTipo.get(idTipoFoto);
    if (!rows?.length) return null;
    return rows[0].ruta ?? null;
  }

  /** Archivos múltiples: arreglo de rutas (puede ser vacío). */
  private multiFotoUrls(
    fotosByTipo: Map<number, FotoRow[]>,
    idTipoFoto: number,
  ): string[] {
    const rows = fotosByTipo.get(idTipoFoto) ?? [];
    return rows
      .map((row) => row.ruta)
      .filter((ruta): ruta is string => ruta != null && ruta !== '');
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
      Id: sapac ? Number(sapac.id) : null,
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
      Id: catastro ? Number(catastro.id) : null,
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
      Id: licencias ? Number(licencias.id) : null,
      Registro: licencias?.registro ?? null,
      NombreComercial: licencias?.nombreComercial ?? null,
      Giro: licencias?.giro ?? null,
      LicenciaSuelo: licencias?.licenciaSuelo ?? null,
      NombrePropietario: licencias?.nombrePropietario ?? null,
      ApellidoPaternoPropietario: licencias?.apellidoPaternoPropietario ?? null,
      ApellidoMaternoPropietario: licencias?.apellidoMaternoPropietario ?? null,
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
    if (!contacto) return null;
    return {
      Id: Number(contacto.id),
      Nombre: contacto.nombre,
      ApellidoPaterno: contacto.apellidoPaterno,
      ApellidoMaterno: contacto.apellidoMaterno,
      Telefono: contacto.telefono,
      Correo: contacto.correo,
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
      Id: pc ? Number(pc.id) : null,
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
    if (!contacto) return null;
    return {
      Id: Number(contacto.id),
      Nombre: contacto.nombre,
      ApellidoPaterno: contacto.apellidoPaterno,
      ApellidoMaterno: contacto.apellidoMaterno,
      Telefono: contacto.telefono,
      Correo: contacto.correo,
    };
  }

  private mapLicenciaConstruccionScalars(lc: LicenciaConstruccion) {
    return {
      Id: Number(lc.id),
      TipoSolicitudLicencia: lc.tipoSolicitudLicencia,
      DescripcionProyecto: lc.descripcionProyecto,
      SuperficieTerrenoM2: lc.superficieTerrenoM2,
      SuperficieTerrenoObraM2: lc.superficieTerrenoObraM2,
      DescripcionSistemaConstructivo: lc.descripcionSistemaConstructivo,
      NombrePropietario: lc.nombrePropietario,
      DomicilioNotificacion: lc.domicilioNotificacion,
      RFC: lc.rfc,
      NombreDRO: lc.nombreDRO,
      NoRegLicenciaConstruccion: lc.noRegLicenciaConstruccion,
      CedulaProfesional: lc.cedulaProfesional,
      Fecha: lc.fecha,
      NumeroExpediente: lc.numeroExpediente,
      NumeroControl: lc.numeroControl,
      SeguimientoObra: lc.seguimientoObra,
      ConstanciaAlineamiento: lc.constanciaAlineamiento,
      LicenciaUsoSuelo: lc.licenciaUsoSuelo,
      PlanoAutorizado: lc.planoAutorizado,
      LicenciaFraccionamiento: lc.licenciaFraccionamiento,
      Escrituras: lc.escrituras,
      FactibilidadAguaPotable: lc.factibilidadAguaPotable,
      RecibosPagoPredial: lc.recibosPagoPredial,
      RecibosMunicipales: lc.recibosMunicipales,
      PlanoArquitectonicos: lc.planoArquitectonicos,
      Otros: lc.otros,
    };
  }

  private mapLcDocumentos(fotosByTipo: Map<number, FotoRow[]>) {
    const result: Record<string, string[]> = {};
    for (const [key, idTipoFoto] of Object.entries(
      LICENCIA_CONSTRUCCION_DOCUMENTO_TIPO_FOTO,
    )) {
      result[key] = this.multiFotoUrls(fotosByTipo, idTipoFoto);
    }
    return result;
  }

  private mapLcFirmas(fotosByTipo: Map<number, FotoRow[]>) {
    const result: Record<string, string | null> = {};
    for (const [key, idTipoFoto] of Object.entries(FIRMA_TIPO_FOTO)) {
      result[key] = this.singleFotoUrl(fotosByTipo, idTipoFoto);
    }
    return result;
  }

  private mapListItem(
    registro: Registros,
    licencia: Licencias | null,
    visitaFields: CapturistaVisitaFlatFields,
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

      ...visitaFields,
    };
  }
}

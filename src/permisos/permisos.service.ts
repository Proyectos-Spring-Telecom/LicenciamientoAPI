import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { UpdatePermisoDto } from './dto/update-permiso.dto';
import { Permisos } from 'src/entities/Permisos';
import { RolesPermisos } from 'src/entities/RolesPermisos';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BitacoraLoggerService } from 'src/bitacora/bitacora.service';
import { ApiCrudResponse, ApiResponseCommon, EstatusEnumBitcora } from 'src/common/ApiResponse';
import { EnumModulos } from 'src/common/estatus.enum';

const ROL_PERMISO_DEFAULT = 4;

export interface PermisoAgrupadoRow {
  IdPermiso: number;
  IdModulo: number;
  NombreModulo: string;
  PermisoId: number;
  PermisoNombre: string;
  PermisoDescripcion: string;
}

export interface PermisoListItem {
  idPermiso: number;
  nombrePermiso: number | string | null;
  descripcionPermiso: string | null;
  idModulo: number;
  nombreModulo: string | null;
}

export interface PermisoPaginatedItem extends PermisoListItem {
  estatus: number;
}

export interface ModuloAgrupado {
  IdModulo: number;
  NombreModulo: string;
  Permisos: {
    Id: number;
    Nombre: string;
    Descripcion: string;
  }[];
}

@Injectable()
export class PermisosService {
  constructor(
    @InjectRepository(Permisos)
    private readonly permisoRepository: Repository<Permisos>,
    @InjectRepository(RolesPermisos)
    private readonly rolesPermisosRepository: Repository<RolesPermisos>,
    private readonly bitacoraLogger: BitacoraLoggerService,
  ) { }

  private mapPermisoListItem(permiso: Permisos): PermisoListItem {
    const nombrePermiso =
      permiso.nombre != null && permiso.nombre.trim() !== '' &&
      !Number.isNaN(Number(permiso.nombre))
        ? Number(permiso.nombre)
        : permiso.nombre;

    return {
      idPermiso: Number(permiso.id),
      nombrePermiso,
      descripcionPermiso: permiso.descripcion ?? permiso.nombre,
      idModulo: Number(permiso.idModulo),
      nombreModulo: permiso.idModulo2?.nombre ?? null,
    };
  }

  private mapPermisoPaginatedItem(permiso: Permisos): PermisoPaginatedItem {
    return {
      ...this.mapPermisoListItem(permiso),
      estatus: permiso.estatus,
    };
  }

  //Obtener todos los permisos con paginado
  async findAll(page: number, limit: number): Promise<ApiResponseCommon> {
    const [data, total] = await this.permisoRepository.findAndCount({
      relations: ['idModulo2'],
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'ASC' },
    });

    return {
      data: data.map((permiso) => this.mapPermisoPaginatedItem(permiso)),
      paginated: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  //Obtener todos los permisos
  async findAllList(): Promise<PermisoListItem[]> {
    try {
      const permisos = await this.permisoRepository.find({
        relations: ['idModulo2'],
        where: { estatus: 1 },
        order: { id: 'ASC' },
      });

      return permisos.map((permiso) => this.mapPermisoListItem(permiso));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener todos los permisos:`,
        error,
      );
    }
  }

  //Obtener permiso by ID
  async findOne(id: number) {
    try {
      const permiso = await this.permisoRepository.findOne({
        where: { id: id },
        relations: ['idModulo2'],
      });
      if (!permiso) throw new NotFoundException('Permiso no encontrado');

      return { data: permiso };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al obtener el permiso por ID`,
      );
    }
  }

  async createPermiso(
    createPermiso: CreatePermisoDto,
    idUsuario,
  ): Promise<ApiCrudResponse> {
    try {
      const savedPermiso = await this.permisoRepository.save(
        this.permisoRepository.create({
          nombre: createPermiso.nombre,
          descripcion: createPermiso.descripcion,
          idModulo: createPermiso.idModulo,
          estatus: 1,
        }),
      );

      await this.rolesPermisosRepository.save(
        this.rolesPermisosRepository.create({
          idRol: ROL_PERMISO_DEFAULT,
          idPermiso: savedPermiso.id,
        }),
      );

      const querylogger = { createPermiso };
      await this.bitacoraLogger.logToBitacora(
        'Permisos',
        `Se creó el permiso: ${savedPermiso.nombre}`,
        'CREATE',
        querylogger,
        Number(idUsuario),
        EnumModulos.PERMISOS,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Permiso creado correctamente',
        data: {
          id: Number(savedPermiso.id),
          nombre: savedPermiso.nombre ?? '',
        },
      };
    } catch (error) {
      const querylogger = { createPermiso };
      await this.bitacoraLogger.logToBitacora(
        'Permisos',
        `Se creó el permiso: ${createPermiso.nombre}`,
        'CREATE',
        querylogger,
        Number(idUsuario),
        EnumModulos.PERMISOS,
        EstatusEnumBitcora.ERROR,
        error.message,
      );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(`Error al crear permisos`);
    }
  }

  async updateEstatus(
    id: number,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const permiso = await this.permisoRepository.findOne({
        where: { id },
      });
      if (!permiso) throw new NotFoundException('Permiso no encontrado');

      const estatus = permiso.estatus === 1 ? 0 : 1;
      await this.permisoRepository.update(id, { estatus });

      const querylogger = { id, estatus };
      await this.bitacoraLogger.logToBitacora(
        'Permisos',
        `Se actualizo a estatus ${estatus} del permiso: ${permiso.nombre}`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.PERMISOS,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Estatus permiso actualizado correctamente',
        estatus: { estatus },
        data: {
          id,
          nombre: permiso.nombre ?? '',
        },
      };
    } catch (error) {
      const querylogger = { id };
      await this.bitacoraLogger.logToBitacora(
        'Permisos',
        `Se actualizo el estatus del permiso ID: ${id}`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.PERMISOS,
        EstatusEnumBitcora.ERROR,
        error.message,
      );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al cambiar estatus del permiso',
      );
    }
  }

  async update(
    id: number,
    updatePermiso: UpdatePermisoDto,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const permiso = await this.permisoRepository.findOne({
        where: { id: id },
      });
      if (!permiso) throw new NotFoundException('Permiso no encontrado');

      await this.permisoRepository.update(id, {
        descripcion: updatePermiso.descripcion,
      });

      const permisoResult = await this.permisoRepository.findOne({
        where: { id: id },
      });

      // --- Registro en la bitácora --- SUCCESS
      const querylogger = { updatePermiso };
      await this.bitacoraLogger.logToBitacora(
        'Permisos',
        `Se actualizo permiso: ${permisoResult?.nombre}`,
        'UPDATE',
        querylogger,
        idUser,
        4,
        EstatusEnumBitcora.SUCCESS,
      );

      //Api response
      const result: ApiCrudResponse = {
        status: 'success',
        message: 'Permiso actualizado correctamente',
        data: {
          id: id,
          nombre: permisoResult?.nombre ?? '',
        },
      };
      return result;
    } catch (error) {
      // --- Registro en la bitácora --- ERROR
      const querylogger = { updatePermiso };
      await this.bitacoraLogger.logToBitacora(
        'Permisos',
        `Se actualizo permiso con ID: ${id}`,
        'UPDATE',
        querylogger,
        idUser,
        4,
        EstatusEnumBitcora.ERROR,
        error.message,
      );
      return error;
    }
  }

  async remove(id: number, idUser: number): Promise<ApiCrudResponse> {
    try {
      const permiso = await this.permisoRepository.findOne({
        where: { id: id },
      });
      if (!permiso) throw new NotFoundException('Permiso no encontrado');
      //Desahabilitamos el permiso
      await this.permisoRepository.update(id, { estatus: 0 });

      // --- Registro en la bitácora --- SUCCESS
      const querylogger = { id: id, estatus: 0 };
      await this.bitacoraLogger.logToBitacora(
        'Permisos',
        `Se desactivo el permiso: ${permiso.nombre}`,
        'UPDATE',
        querylogger,
        idUser,
        4,
        EstatusEnumBitcora.SUCCESS,
      );

      //Api response
      const result: ApiCrudResponse = {
        status: 'success',
        message: 'Permiso eliminado correctamente',
        data: {
          id: id,
          nombre: `${permiso.nombre} ${permiso.descripcion} ` || '',
        },
      };
      return result;
    } catch (error) {
      // --- Registro en la bitácora --- ERROR
      const querylogger = { id: id, estatus: 0 };
      await this.bitacoraLogger.logToBitacora(
        'Permisos',
        `Se desactivo el permiso con ID: ${id}`,
        'UPDATE',
        querylogger,
        idUser,
        4,
        EstatusEnumBitcora.ERROR,
        error.message,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(`Error al eliminar permisos`);
    }
  }


  private qualifiedTable(table: string): string {
    const schema = process.env.DB_DATABASE || 'TAE';
    return `\`${schema}\`.\`${table}\``;
  }

  private groupPermisosRows(rows: PermisoAgrupadoRow[]): ModuloAgrupado[] {
    return rows.reduce<ModuloAgrupado[]>((result, item) => {
      let moduloExistente = result.find(
        (mod) => mod.IdModulo === item.IdModulo,
      );

      if (!moduloExistente) {
        moduloExistente = {
          IdModulo: item.IdModulo,
          NombreModulo: item.NombreModulo,
          Permisos: [],
        };
        result.push(moduloExistente);
      }

      moduloExistente.Permisos.push({
        Id: item.PermisoId,
        Nombre: item.PermisoNombre,
        Descripcion: item.PermisoDescripcion,
      });

      return result;
    }, []);
  }

  private async getPermisosAgrupadosByRolId(
    idRol: number,
  ): Promise<ModuloAgrupado[]> {
    const rolesPermisos = this.qualifiedTable('RolesPermisos');
    const permisos = this.qualifiedTable('Permisos');
    const modulos = this.qualifiedTable('CatModulos');
    const roles = this.qualifiedTable('Roles');

    const query = `
      SELECT DISTINCT
        ${rolesPermisos}.IdPermiso,
        ${modulos}.Id AS IdModulo,
        ${modulos}.Nombre AS NombreModulo,
        ${permisos}.Id AS PermisoId,
        ${permisos}.Nombre AS PermisoNombre,
        ${permisos}.Descripcion AS PermisoDescripcion
      FROM ${rolesPermisos}
      INNER JOIN ${roles} ON ${rolesPermisos}.IdRol = ${roles}.Id
      INNER JOIN ${permisos} ON ${rolesPermisos}.IdPermiso = ${permisos}.Id
      INNER JOIN ${modulos} ON ${permisos}.IdModulo = ${modulos}.Id
      WHERE ${rolesPermisos}.IdRol = ?
        AND ${roles}.Estatus = 1
        AND ${permisos}.Estatus = 1
        AND ${modulos}.Estatus = 1
    `;

    const rows = (await this.permisoRepository.query(query, [
      idRol,
    ])) as PermisoAgrupadoRow[];

    return this.groupPermisosRows(rows);
  }

  async obtenerPermisosAgrupados(idRol: number | null): Promise<ModuloAgrupado[]> {
    if (idRol == null) {
      throw new UnauthorizedException('El token no incluye un rol asignado.');
    }

    try {
      return await this.getPermisosAgrupadosByRolId(idRol);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al obtener permisos agrupados',
      );
    }
  }
}

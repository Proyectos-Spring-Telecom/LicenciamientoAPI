import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Roles } from 'src/entities/Roles';
import { RolesPermisos } from 'src/entities/RolesPermisos';
import { Permisos } from 'src/entities/Permisos';
import { BitacoraLoggerService } from 'src/bitacora/bitacora.service';
import {
  ApiCrudResponse,
  ApiResponseCommon,
  EstatusEnumBitcora,
} from 'src/common/ApiResponse';
import { PermisosService } from 'src/permisos/permisos.service';
import { EnumModulos } from 'src/common/estatus.enum';

export interface RolCreatedResponse {
  id: number;
  nombre: string;
  estatus: number;
}

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Roles)
    private readonly rolesRepository: Repository<Roles>,
    @InjectRepository(Permisos)
    private readonly permisosRepository: Repository<Permisos>,
    private readonly bitacoraLogger: BitacoraLoggerService,
    private readonly permisosService: PermisosService,
    private readonly dataSource: DataSource,
  ) { }

  private async validatePermisosIds(permisoIds: number[]): Promise<void> {
    const uniqueIds = [...new Set(permisoIds)];
    if (uniqueIds.length === 0) {
      return;
    }

    const count = await this.permisosRepository.count({
      where: { id: In(uniqueIds) },
    });

    if (count !== uniqueIds.length) {
      throw new BadRequestException('Los permisos son inválidos');
    }
  }

  private async syncRolesPermisos(
    idRol: number,
    permisoIds: number[],
    manager = this.dataSource.manager,
  ): Promise<void> {
    const uniquePermisos = [...new Set(permisoIds)];
    const current = await manager.find(RolesPermisos, {
      where: { idRol },
    });
    const currentIds = current
      .map((item) => Number(item.idPermiso))
      .filter((id) => !Number.isNaN(id));

    const toRemove = current.filter(
      (item) => !uniquePermisos.includes(Number(item.idPermiso)),
    );
    const toAdd = uniquePermisos.filter((id) => !currentIds.includes(id));

    if (toRemove.length > 0) {
      await manager.remove(RolesPermisos, toRemove);
    }

    for (const idPermiso of toAdd) {
      await manager.save(RolesPermisos, { idRol, idPermiso });
    }
  }

  async create(
    idUser: number,
    createRoleDto: CreateRolDto,
  ): Promise<RolCreatedResponse> {
    try {
      const existente = await this.rolesRepository.find({
        where: { nombre: createRoleDto.nombre },
      });
      if (existente.length !== 0) {
        throw new BadRequestException('El rol ya existe');
      }

      if (createRoleDto.permisos?.length) {
        await this.validatePermisosIds(createRoleDto.permisos);
      }

      const rolSave = await this.dataSource.transaction(async (manager) => {
        const rol = await manager.save(Roles, {
          nombre: createRoleDto.nombre,
          estatus: 1,
        });

        if (createRoleDto.permisos?.length) {
          const uniquePermisos = [...new Set(createRoleDto.permisos)];
          for (const idPermiso of uniquePermisos) {
            await manager.save(RolesPermisos, {
              idRol: rol.id,
              idPermiso,
            });
          }
        }

        return rol;
      });

      const querylogger = { createRoleDto };
      await this.bitacoraLogger.logToBitacora(
        'Roles',
        `Se creó un rol con nombre: ${rolSave.nombre}`,
        'CREATE',
        querylogger,
        idUser,
        EnumModulos.ROLES,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        id: Number(rolSave.id),
        nombre: rolSave.nombre,
        estatus: rolSave.estatus,
      };
    } catch (error) {
      const querylogger = { createRoleDto };
      await this.bitacoraLogger.logToBitacora(
        'Roles',
        `Se creó un rol con nombre: ${createRoleDto.nombre}`,
        'CREATE',
        querylogger,
        idUser,
        EnumModulos.ROLES,
        EstatusEnumBitcora.ERROR,
        error instanceof Error ? error.message : String(error),
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear rol');
    }
  }

  async findAll(page: number, limit: number): Promise<ApiResponseCommon> {
    const [data, total] = await this.rolesRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'DESC' },
    });

    return {
      data: data.map((item) => ({
        ...item,
        id: Number(item.id),
      })),
      paginated: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findAllList(): Promise<ApiResponseCommon> {
    const roles = await this.rolesRepository.find({
      where: { estatus: 1 },
      order: { nombre: 'ASC' },
    });

    return {
      data: roles.map((item) => ({
        ...item,
        id: Number(item.id),
      })),
    };
  }

  async findOne(id: number) {
    try {
      const rol = await this.rolesRepository.findOne({
        where: { id },
      });
      if (!rol) throw new NotFoundException('Rol no encontrado');

      const permisos = await this.permisosService.getPermisosAgrupadosByRolId(id);

      return {
        data: {
          ...rol,
          id: Number(rol.id),
          permisos,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(`Error al obtener el rol`);
    }
  }

  async update(
    idUser: number,
    updateRolDto: UpdateRolDto,
  ): Promise<string> {
    try {
      const rol = await this.rolesRepository.findOne({
        where: { id: updateRolDto.id },
      });
      if (!rol) {
        throw new BadRequestException('Rol no encontrado');
      }

      if (updateRolDto.permisos !== undefined) {
        await this.validatePermisosIds(updateRolDto.permisos);
      }

      await this.dataSource.transaction(async (manager) => {
        await manager.update(Roles, updateRolDto.id, {
          nombre: updateRolDto.nombre,
        });

        if (updateRolDto.permisos !== undefined) {
          await this.syncRolesPermisos(
            updateRolDto.id,
            updateRolDto.permisos,
            manager,
          );
        }
      });

      const querylogger = { updateRolDto };
      await this.bitacoraLogger.logToBitacora(
        'Roles',
        `Se actualizo el rol: ${updateRolDto.nombre}`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.ROLES,
        EstatusEnumBitcora.SUCCESS,
      );

      return 'Rol actualizado';
    } catch (error) {
      const querylogger = { updateRolDto };
      await this.bitacoraLogger.logToBitacora(
        'Roles',
        `Se actualizo el rol: ${updateRolDto.nombre}`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.ROLES,
        EstatusEnumBitcora.ERROR,
        error instanceof Error ? error.message : String(error),
      );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar rol');
    }
  }

  async updateEstatus(
    id: number,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const rol = await this.rolesRepository.findOne({
        where: { id },
      });
      if (!rol) throw new NotFoundException('Rol no encontrado');

      const estatus = rol.estatus === 1 ? 0 : 1;
      await this.rolesRepository.update(id, { estatus });

      const querylogger = { id, estatus };
      await this.bitacoraLogger.logToBitacora(
        'Roles',
        `Se actualizo a estatus ${estatus} del rol: ${rol.nombre}`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.ROLES,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Estatus rol actualizado correctamente',
        estatus: { estatus },
        data: {
          id,
          nombre: rol.nombre,
        },
      };
    } catch (error) {
      const querylogger = { id };
      await this.bitacoraLogger.logToBitacora(
        'Roles',
        `Se actualizo el estatus del rol con ID: ${id}`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.ROLES,
        EstatusEnumBitcora.ERROR,
        error instanceof Error ? error.message : String(error),
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al cambiar estatus rol');
    }
  }

  async remove(id: number, idUser: number) {
    try {
      const rol = await this.rolesRepository.findOne({ where: { id } });
      if (!rol) throw new NotFoundException('Rol no encontrado');

      await this.rolesRepository.update(id, { estatus: 0 });

      const querylogger = { id, estatus: 0 };
      await this.bitacoraLogger.logToBitacora(
        'Roles',
        `Se desactivo el rol: ${rol.nombre}`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.ROLES,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Rol eliminado correctamente',
        data: {
          id,
          nombre: rol.nombre,
        },
      };
    } catch (error) {
      const querylogger = { id, estatus: 0 };
      await this.bitacoraLogger.logToBitacora(
        'Roles',
        `Se desactivo el rol con ID: ${id}`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.ROLES,
        EstatusEnumBitcora.ERROR,
        error instanceof Error ? error.message : String(error),
      );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar rol');
    }
  }
}


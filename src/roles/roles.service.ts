import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Roles } from 'src/entities/Roles';
import { BitacoraLoggerService } from 'src/bitacora/bitacora.service';
import {
  ApiCrudResponse,
  ApiResponseCommon,
  EstatusEnumBitcora,
} from 'src/common/ApiResponse';
import { UpdateRolEstatusDto } from './dto/update-rol.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Roles)
    private readonly rolesRepository: Repository<Roles>,
    private readonly bitacoraLogger: BitacoraLoggerService,
  ) {}

  async create(
    idUser: number,
    createRoleDto: CreateRolDto,
  ): Promise<ApiCrudResponse> {
    try {
      const existente = await this.rolesRepository.find({
        where: { nombre: createRoleDto.nombre },
      });
      if (existente.length !== 0) {
        throw new BadRequestException('El rol ya existe');
      }

      const newRol = this.rolesRepository.create({
        ...createRoleDto,
        estatus: createRoleDto.estatus ?? 1,
      });
      const rolSave = await this.rolesRepository.save(newRol);

      const querylogger = { createRoleDto };
      await this.bitacoraLogger.logToBitacora(
        'Roles',
        `Se creó un rol con nombre: ${rolSave.nombre}`,
        'CREATE',
        querylogger,
        idUser,
        null,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Rol creado correctamente',
        data: {
          id: Number(rolSave.id),
          nombre: rolSave.nombre,
        },
      };
    } catch (error) {
      const querylogger = { createRoleDto };
      await this.bitacoraLogger.logToBitacora(
        'Roles',
        `Se creó un rol con nombre: ${createRoleDto.nombre}`,
        'CREATE',
        querylogger,
        idUser,
        null,
        EstatusEnumBitcora.ERROR,
        error.message,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Error al crear rol',
        error,
      });
    }
  }

  async findAll(
    rol: number,
    page: number,
    limit: number,
  ): Promise<ApiResponseCommon> {
    let data: Roles[];
    let total: number;

    switch (rol) {
      case 1:
        [data, total] = await this.rolesRepository.findAndCount({
          skip: (page - 1) * limit,
          take: limit,
          order: { id: 'DESC' },
        });
        break;

      default:
        [data, total] = await this.rolesRepository.findAndCount({
          skip: (page - 1) * limit,
          take: limit,
          where: { id: Not(1) },
          order: { id: 'DESC' },
        });
        break;
    }

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

  async findAllList(rol: number): Promise<ApiResponseCommon> {
    let roles: Roles[];

    switch (rol) {
      case 1:
        roles = await this.rolesRepository.find({
          where: { estatus: 1 },
          order: { nombre: 'ASC' },
        });
        break;

      default:
        roles = await this.rolesRepository.find({
          where: {
            estatus: 1,
            id: Not(1),
          },
          order: { nombre: 'ASC' },
        });
        break;
    }

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

      return {
        data: {
          ...rol,
          id: Number(rol.id),
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
    id: number,
    idUser: number,
    updateRoleDto: UpdateRoleDto,
  ): Promise<ApiCrudResponse> {
    try {
      const rol = await this.rolesRepository.findOne({ where: { id } });
      if (!rol) throw new NotFoundException('Rol no encontrado');

      await this.rolesRepository.update(id, updateRoleDto);

      const querylogger = { updateRoleDto };
      await this.bitacoraLogger.logToBitacora(
        'Roles',
        `Se actualizo el rol: ${updateRoleDto?.nombre ?? rol.nombre}`,
        'UPDATE',
        querylogger,
        idUser,
        null,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Rol actualizado correctamente',
        data: {
          id,
          nombre: updateRoleDto?.nombre ?? rol.nombre,
        },
      };
    } catch (error) {
      const querylogger = { updateRoleDto };
      await this.bitacoraLogger.logToBitacora(
        'Roles',
        `Se actualizo el rol: ${updateRoleDto?.nombre}`,
        'UPDATE',
        querylogger,
        idUser,
        null,
        EstatusEnumBitcora.ERROR,
        error.message,
      );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Error al actualizar rol',
        error,
      });
    }
  }

  async updateEstatus(
    id: number,
    idUser: number,
    updateRolEstatusDto: UpdateRolEstatusDto,
  ): Promise<ApiCrudResponse> {
    try {
      const rol = await this.rolesRepository.findOne({
        where: { id },
      });
      if (!rol) throw new NotFoundException('Rol no encontrado');

      await this.rolesRepository.update(id, {
        estatus: updateRolEstatusDto.estatus,
      });

      const querylogger = { updateRolEstatusDto };
      await this.bitacoraLogger.logToBitacora(
        'Roles',
        `Se actualizo a estatus ${updateRolEstatusDto.estatus} del rol: ${rol.nombre}`,
        'UPDATE',
        querylogger,
        idUser,
        null,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Estatus rol actualizado correctamente',
        estatus: { estatus: updateRolEstatusDto.estatus },
        data: {
          id,
          nombre: rol.nombre,
        },
      };
    } catch (error) {
      const querylogger = { updateRolEstatusDto };
      await this.bitacoraLogger.logToBitacora(
        'Roles',
        `Se actualizo a estatus ${updateRolEstatusDto.estatus} del rol con ID: ${id}`,
        'UPDATE',
        querylogger,
        idUser,
        null,
        EstatusEnumBitcora.ERROR,
        error.message,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Error al cambiar estatus rol',
        error,
      });
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
        null,
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
        null,
        EstatusEnumBitcora.ERROR,
        error.message,
      );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Error al eliminar rol',
        error,
      });
    }
  }
}


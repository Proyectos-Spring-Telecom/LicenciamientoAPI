import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { UpdateModuloDto } from './dto/update-modulo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CatModulos } from 'src/entities/CatModulos';
import { Permisos } from 'src/entities/Permisos';
import { Repository } from 'typeorm';
import { BitacoraLoggerService } from 'src/bitacora/bitacora.service';
import {
  ApiCrudResponse,
  ApiResponseCommon,
  EstatusEnumBitcora,
} from 'src/common/ApiResponse';
import { EnumModulos } from 'src/common/estatus.enum';

@Injectable()
export class ModulosService {
  constructor(
    @InjectRepository(CatModulos)
    private readonly moduloRepository: Repository<CatModulos>,
    @InjectRepository(Permisos)
    private readonly permisosRepository: Repository<Permisos>,
    private readonly bitacoraLogger: BitacoraLoggerService,
  ) { }

  private mapModuloPaginatedItem(modulo: CatModulos) {
    return {
      id: Number(modulo.id),
      nombre: modulo.nombre,
      estatus: modulo.estatus,
    };
  }

  private mapModuloListItem(modulo: CatModulos) {
    return {
      id: Number(modulo.id),
      nombre: modulo.nombre,
    };
  }

  private mapModulo(modulo: CatModulos) {
    return {
      ...modulo,
      id: Number(modulo.id),
      permisos: (modulo.permisos ?? []).map((permiso) => ({
        ...permiso,
        id: Number(permiso.id),
        idModulo: Number(permiso.idModulo),
      })),
    };
  }

  async create(
    createModuloDto: CreateModuloDto,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const existente = await this.moduloRepository.findOne({
        where: { nombre: createModuloDto.Nombre },
      });
      if (existente) {
        throw new BadRequestException('El modulo ya existe');
      }

      const saved = await this.moduloRepository.save(
        this.moduloRepository.create({
          nombre: createModuloDto.Nombre,
          estatus: 1,
        }),
      );

      const querylogger = { createModuloDto };
      await this.bitacoraLogger.logToBitacora(
        'CatModulos',
        `Se creó un modulo con nombre: ${saved.nombre}`,
        'CREATE',
        querylogger,
        idUser,
        EnumModulos.MODULOS,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Modulo creado correctamente',
        data: {
          id: Number(saved.id),
          nombre: saved.nombre,
        },
      };
    } catch (error) {
      const querylogger = { createModuloDto };
      await this.bitacoraLogger.logToBitacora(
        'CatModulos',
        `Se creó un modulo con nombre: ${createModuloDto.Nombre}`,
        'CREATE',
        querylogger,
        idUser,
        EnumModulos.MODULOS,
        EstatusEnumBitcora.ERROR,
        error instanceof Error ? error.message : String(error),
      );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear modulo');
    }
  }

  async findAllList(): Promise<{ id: number; nombre: string | null }[]> {
    try {
      const modulos = await this.moduloRepository.find({
        select: ['id', 'nombre'],
        where: { estatus: 1 },
        order: { nombre: 'ASC' },
      });

      return modulos.map((item) => this.mapModuloListItem(item));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener modulos');
    }
  }

  async findAll(page: number, limit: number): Promise<ApiResponseCommon> {
    try {
      const [data, total] = await this.moduloRepository.findAndCount({
        select: ['id', 'nombre', 'estatus'],
        skip: (page - 1) * limit,
        take: limit,
        order: { id: 'DESC' },
      });

      return {
        data: data.map((item) => this.mapModuloPaginatedItem(item)),
        paginated: {
          total,
          page,
          lastPage: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al obtener modulos');
    }
  }

  async findOne(id: number) {
    try {
      const modulo = await this.moduloRepository.findOne({
        where: { id },
        relations: ['permisos'],
      });
      if (!modulo) {
        throw new NotFoundException({ message: 'Módulo no encontrado' });
      }

      return { data: this.mapModulo(modulo) };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al buscar el módulo');
    }
  }

  async update(
    updateModuloDto: UpdateModuloDto,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const id = Number(updateModuloDto.Id);
      const modulo = await this.moduloRepository.findOne({ where: { id } });
      if (!modulo) {
        throw new NotFoundException('Módulo no encontrado');
      }

      const duplicado = await this.moduloRepository.findOne({
        where: { nombre: updateModuloDto.Nombre },
      });
      if (duplicado && Number(duplicado.id) !== id) {
        throw new BadRequestException('El modulo ya existe');
      }

      await this.moduloRepository.update(id, {
        nombre: updateModuloDto.Nombre,
      });

      const querylogger = { updateModuloDto };
      await this.bitacoraLogger.logToBitacora(
        'CatModulos',
        `Se actualizo el modulo: ${updateModuloDto.Nombre}`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.MODULOS,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Modulo actualizado correctamente',
        data: {
          id,
          nombre: updateModuloDto.Nombre,
        },
      };
    } catch (error) {
      const querylogger = { updateModuloDto };
      await this.bitacoraLogger.logToBitacora(
        'CatModulos',
        `Se actualizo el modulo con ID: ${updateModuloDto.Id}`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.MODULOS,
        EstatusEnumBitcora.ERROR,
        error instanceof Error ? error.message : String(error),
      );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar modulo');
    }
  }

  async updateModulosStatus(
    id: number,
    idUser: number,
  ): Promise<ApiCrudResponse> {
    try {
      const modulo = await this.moduloRepository.findOne({ where: { id } });
      if (!modulo) {
        throw new NotFoundException('Modulo no encontrado');
      }

      const estatus = modulo.estatus === 1 ? 0 : 1;
      await this.moduloRepository.update(id, { estatus });
      await this.permisosRepository.update({ idModulo: id }, { estatus });

      const querylogger = { id, estatus };
      await this.bitacoraLogger.logToBitacora(
        'CatModulos',
        `Se actualizo el modulo con ID: ${id} a estatus: ${estatus} y sus permisos relacionados`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.MODULOS,
        EstatusEnumBitcora.SUCCESS,
      );

      return {
        status: 'success',
        message: 'Estatus modulo actualizado correctamente',
        estatus: { estatus },
        data: {
          id,
          nombre: modulo.nombre,
        },
      };
    } catch (error) {
      const querylogger = { id };
      await this.bitacoraLogger.logToBitacora(
        'CatModulos',
        `Se actualizo el modulo con ID: ${id}`,
        'UPDATE',
        querylogger,
        idUser,
        EnumModulos.MODULOS,
        EstatusEnumBitcora.ERROR,
        error instanceof Error ? error.message : String(error),
      );

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al cambiar estatus del modulo con id: ${id}`,
      );
    }
  }
}

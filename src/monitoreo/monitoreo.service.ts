import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ApiResponseCommon } from 'src/common/ApiResponse';
import { CapturistaVisita } from 'src/entities/CapturistaVisita';
import { Registros } from 'src/entities/Registros';
import { GetMonitoreoQueryDto } from './dto/get-monitoreo-query.dto';

@Injectable()
export class MonitoreoService {
  constructor(
    @InjectRepository(Registros)
    private readonly registrosRepository: Repository<Registros>,
  ) {}

  /**
   * Listado paginado de Registros para monitoreo.
   * Visibilidad: 4/3 = todos; 2 = IdGrupo; 1 = IdCapturista.
   * CapturistaVisita solo como filtro (INNER JOIN), no se devuelve.
   */
  async findAll(
    query: GetMonitoreoQueryDto,
    user: AuthenticatedUser,
  ): Promise<ApiResponseCommon> {
    try {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const skip = (page - 1) * limit;

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
        .addOrderBy('registro.id', 'DESC')
        .skip(skip)
        .take(limit);

      const [registros, total] = await queryBuilder.getManyAndCount();

      return {
        data: registros.map((registro) => this.mapItem(registro)),
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
        'Error al obtener el monitoreo',
      );
    }
  }

  private mapItem(registro: Registros) {
    return {
      id: Number(registro.id),
      registro: registro.registro,
      latitud: registro.latitud,
      longitud: registro.longitud,
      entidadFederativa: registro.entidadFederativa,
      municipio: registro.municipio,
      localidad: registro.localidad,
      colonia: registro.colonia,
      calle: registro.calle,
      noInterior: registro.noInterior,
      noExterior: registro.noExterior,
      cp: registro.cp,
      tipoRegistro: registro.tipoRegistro,
      predioObra: registro.predioObra,
      estatus: registro.estatus,
      fechaCreacion: registro.fechaCreacion,
      fechaActualizacion: registro.fechaActualizacion,
    };
  }
}

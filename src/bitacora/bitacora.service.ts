import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateBitacoraDto } from './dto/create-bitacora.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Bitacora } from 'src/entities/Bitacora';
import { Repository } from 'typeorm';
import { ApiResponseCommon } from 'src/common/ApiResponse';

@Injectable()
export class BitacoraLoggerService {
  constructor(
    @InjectRepository(Bitacora)
    private readonly bitacoraRepository: Repository<Bitacora>,
  ) {}

  createBitacora(createBitacoraDto: CreateBitacoraDto) {
    return 'This action adds a new bitacora';
  }

  private readonly bitacoraSelect = `
SELECT
  b.Id AS id,
  b.Modulo AS modulo,
  b.Descripcion AS descripcion,
  b.Accion AS accion,
  b.Query AS query,
  b.FechaCreacion AS fechaCreacion,
  b.Estatus AS estatus,
  b.Error AS error,
  u.Id AS idUsuario,
  u.Nombre AS nombreUsuario,
  u.ApellidoPaterno AS apellidoPaternoUsuario,
  u.ApellidoMaterno AS apellidoMaternoUsuario,
  u.UserName AS UserNameUsuario,
  u.Estatus AS estatusUsuario,
  m.Id AS idModulo,
  m.Nombre AS nombreModulo
FROM Bitacora b
INNER JOIN Usuarios u ON b.IdUsuario = u.Id
INNER JOIN CatModulos m ON b.IdModulo = m.Id`;

  async findAllListBitacora(idGrupo: number, rol: number) {
    try {
      let bitacora;

      if (rol === 1) {
        bitacora = await this.bitacoraRepository.query(
          `${this.bitacoraSelect}
ORDER BY b.FechaCreacion DESC;`,
        );
      } else {
        bitacora = await this.bitacoraRepository.query(
          `${this.bitacoraSelect}
WHERE u.IdGrupo = ?
ORDER BY b.FechaCreacion DESC;`,
          [idGrupo],
        );
      }

      const data = bitacora.map((item) => ({
        ...item,
        id: Number(item.id),
        idUsuario: Number(item.idUsuario),
        idModulo: Number(item.idModulo),
      }));

      return { data };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Ocurrió un error al obtener las bitácoras listado.',
      );
    }
  }

  async findAll(idGrupo: number, rol: number, page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;
      let totalResult;
      let bitacora;

      if (rol === 1) {
        bitacora = await this.bitacoraRepository.query(
          `${this.bitacoraSelect}
ORDER BY b.FechaCreacion DESC
LIMIT ? OFFSET ?;`,
          [limit, offset],
        );

        totalResult = await this.bitacoraRepository.query(
          `SELECT COUNT(*) AS total FROM Bitacora b`,
        );
      } else {
        bitacora = await this.bitacoraRepository.query(
          `${this.bitacoraSelect}
WHERE u.IdGrupo = ?
ORDER BY b.FechaCreacion DESC
LIMIT ? OFFSET ?;`,
          [idGrupo, limit, offset],
        );

        totalResult = await this.bitacoraRepository.query(
          `SELECT COUNT(*) AS total
FROM Bitacora b
INNER JOIN Usuarios u ON b.IdUsuario = u.Id
WHERE u.IdGrupo = ?`,
          [idGrupo],
        );
      }

      const total = Number(totalResult[0]?.total ?? 0);

      const data = bitacora.map((item) => ({
        ...item,
        id: Number(item.id),
        idUsuario: Number(item.idUsuario),
        idModulo: Number(item.idModulo),
      }));

      return {
        data,
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
      throw new InternalServerErrorException(
        'Ocurrió un error al obtener las bitácoras paginada.',
      );
    }
  }

  async findOne(id: number) {
    try {
      const bitacora = await this.bitacoraRepository.query(
        `${this.bitacoraSelect}
WHERE b.Id = ?
ORDER BY b.FechaCreacion DESC;`,
        [id],
      );

      if (bitacora.length === 0) {
        throw new NotFoundException(`Bitácora con ID: ${id} no encontrada.`);
      }

      const data = bitacora.map((item) => ({
        ...item,
        id: Number(item.id),
        idUsuario: Number(item.idUsuario),
        idModulo: Number(item.idModulo),
      }));

      return { data };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Ocurrió un error al obtener las bitácoras paginada.',
      });
    }
  }

  async logToBitacora(
    modulo: string,
    descripcion: string,
    accion: string,
    query: object,
    idUsuario: number,
    idModulo: number | null,
    estatus?: string,
    error?: string,
  ) {
    const registro = this.bitacoraRepository.create({
      modulo,
      descripcion,
      accion,
      query: JSON.stringify(query),
      estatus: estatus ?? null,
      error: error ?? null,
      idUsuario,
      idModulo,
    });

    await this.bitacoraRepository.save(registro);
  }
}

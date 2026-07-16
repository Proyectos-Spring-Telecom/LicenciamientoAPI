import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/**
 * Convierte query string a entero solo si es un entero válido.
 * Vacío/ausente → default. Valores como "10abc" o "1.5" se dejan
 * para que @IsInt los rechace (no usar parseInt sin validar).
 */
function toPage({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') {
    return 1;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : value;
}

function toLimit({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') {
    return 10;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : value;
}

/** Query params de GET /registros (paginación). */
export class GetRegistrosQueryDto {
  @Transform(toPage)
  @IsInt({ message: 'page debe ser un número entero.' })
  @Min(1, { message: 'page debe ser mayor o igual a 1.' })
  @ApiPropertyOptional({
    description: 'Número de página. Mínimo 1.',
    example: 1,
    default: 1,
    minimum: 1,
  })
  page: number = 1;

  @Transform(toLimit)
  @IsInt({ message: 'limit debe ser un número entero.' })
  @Min(1, { message: 'limit debe ser mayor o igual a 1.' })
  @Max(100, { message: 'limit no puede ser mayor a 100.' })
  @ApiPropertyOptional({
    description: 'Cantidad de registros por página. Máximo 100.',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  limit: number = 10;
}

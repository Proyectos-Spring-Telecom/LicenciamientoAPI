import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return undefined;
  }
  return typeof value === 'string' ? value.trim() : value;
}

/** Conserva el texto exacto (incluidos ceros a la izquierda). No convierte a número. */
function toOptionalClave({ value }: { value: unknown }): unknown {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return undefined;
  }
  return String(value).trim();
}

/**
 * Convierte a número finito solo si el valor completo es numérico.
 * No convierte "" a 0 y no acepta parseos parciales (p. ej. "120abc").
 */
function toOptionalFiniteNumber({ value }: { value: unknown }): unknown {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
      return value;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}

export class CreateCatastroDto {
  @Transform(toOptionalClave)
  @IsOptional()
  @IsString({ message: 'Clave debe ser una cadena de texto' })
  @MaxLength(200, { message: 'Clave no puede exceder 200 caracteres' })
  @ApiPropertyOptional({
    type: String,
    maxLength: 200,
    example: '1100-01-002-003',
  })
  Clave?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @ApiPropertyOptional()
  M2?: string;

  @Transform(toOptionalFiniteNumber)
  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'Superficie debe ser un número válido' },
  )
  @Min(0, { message: 'Superficie debe ser mayor o igual a 0' })
  @ApiPropertyOptional({ example: 120.5 })
  Superficie?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @ApiPropertyOptional()
  UsoSuelo?: string;
}

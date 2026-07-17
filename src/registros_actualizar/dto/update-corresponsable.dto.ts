import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
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

/** Entero positivo desde multipart. Vacío → undefined. */
function toOptionalPositiveInt({ value }: { value: unknown }): unknown {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return undefined;
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return value;
}

/**
 * Corresponsable parcial para PATCH.
 * `Id` solo identifica el registro; no se acepta IdLicenciaConstruccion.
 */
export class UpdateCorresponsableDto {
  @Transform(toOptionalPositiveInt)
  @IsOptional()
  @IsInt({ message: 'Corresponsables.Id debe ser un entero' })
  @Min(1, { message: 'Corresponsables.Id debe ser mayor o igual a 1' })
  @ApiPropertyOptional({ example: 3 })
  Id?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(191)
  @ApiPropertyOptional()
  NombreCompleto?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional()
  NoRegLicenciaConstruccion?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @ApiPropertyOptional()
  CedulaProfesional?: string;
}

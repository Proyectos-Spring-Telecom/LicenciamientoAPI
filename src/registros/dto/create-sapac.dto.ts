import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

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

function toOptionalInt({ value }: { value: unknown }): unknown {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return undefined;
  }

  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return value;
}

function toOptionalTipoServicio({ value }: { value: unknown }): unknown {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return undefined;
  }

  if (value === '1' || value === 1) {
    return 1;
  }

  if (value === '2' || value === 2) {
    return 2;
  }

  return value;
}

export class CreateSapacDto {
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional()
  NumeroCuenta?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional()
  Nombre?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional()
  ApellidoPaterno?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional()
  ApellidoMaterno?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(16)
  @ApiPropertyOptional()
  RFC?: string;

  @Transform(toOptionalInt)
  @IsOptional()
  @IsInt({ message: 'Sector debe ser un entero' })
  @ApiPropertyOptional()
  Sector?: number;

  @Transform(toOptionalInt)
  @IsOptional()
  @IsInt({ message: 'Ruta debe ser un entero' })
  @ApiPropertyOptional()
  Ruta?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional()
  Folio?: string;

  @Transform(toOptionalTipoServicio)
  @IsOptional()
  @IsInt({ message: 'Sapac.IdTipoServicio debe ser un número entero.' })
  @IsIn([1, 2], {
    message: 'Sapac.IdTipoServicio solo puede tener los valores 1 o 2.',
  })
  @ApiPropertyOptional({
    enum: [1, 2],
    description: 'Tipo de servicio SAPAC: 1 = SM, 2 = SP',
    example: 1,
  })
  IdTipoServicio?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional()
  Medidor?: string;
}

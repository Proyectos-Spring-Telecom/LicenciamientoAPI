import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Cadena vacía → null; omitido (undefined) no se transforma (no actualizar). */
function emptyToNull({ value }: { value: unknown }): unknown {
  if (value === undefined) return undefined;
  if (value === '') return null;
  return value;
}

/**
 * Número decimal desde multipart. Vacío/null → undefined (no actualizar).
 * Rechaza NaN / valores parcialmente numéricos (p. ej. 18.5abc).
 */
function toOptionalNumber({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || !/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return value;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : value;
  }
  return value;
}

/**
 * Solo '0'/'1' (o 0/1) → número. Resto intacto para @IsIn.
 * No usar Boolean(value): Boolean('0') === true.
 */
function toOptionalBinaryFlag({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === '0' || value === 0) return 0;
  if (value === '1' || value === 1) return 1;
  return value;
}

/**
 * Entero positivo estricto desde multipart (idRegistro).
 * Rechaza '', '0' (vía @Min), '-1', 'abc', '1abc', '10.5'.
 */
function toStrictPositiveInt({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      return value;
    }
    return Number.parseInt(trimmed, 10);
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  return value;
}

/**
 * DTO plano multipart/form-data para actualizar columnas de Registros.
 * No incluye Estatus: se actualiza solo vía PATCH /registros/:idRegistro/estatus.
 */
export class ActualizarRegistroDto {
  @Transform(toStrictPositiveInt)
  @IsInt({ message: 'idRegistro debe ser un entero' })
  @Min(1, { message: 'idRegistro debe ser mayor o igual a 1' })
  @ApiProperty({
    description: 'Identificador del registro que se desea actualizar',
    example: 10,
  })
  idRegistro!: number;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(25)
  @ApiPropertyOptional({
    description: 'Folio o identificador del registro',
    example: 'REG-00010',
    maxLength: 25,
    nullable: true,
  })
  Registro?: string | null;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber({}, { message: 'Latitud debe ser un número' })
  @ApiPropertyOptional({
    description: 'Latitud del registro',
    example: 18.9212,
    nullable: true,
  })
  Latitud?: number | null;

  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber({}, { message: 'Longitud debe ser un número' })
  @ApiPropertyOptional({
    description: 'Longitud del registro',
    example: -99.2345,
    nullable: true,
  })
  Longitud?: number | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({
    description: 'Entidad federativa',
    example: 'Morelos',
    maxLength: 100,
    nullable: true,
  })
  EntidadFederativa?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({
    description: 'Municipio',
    example: 'Cuernavaca',
    maxLength: 100,
    nullable: true,
  })
  Municipio?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({
    description: 'Localidad',
    example: 'Cuernavaca',
    maxLength: 100,
    nullable: true,
  })
  Localidad?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({
    description: 'Colonia',
    example: 'Centro',
    maxLength: 100,
    nullable: true,
  })
  Colonia?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({
    description: 'Calle',
    example: 'Avenida Universidad',
    maxLength: 100,
    nullable: true,
  })
  Calle?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional({
    description: 'Número interior',
    example: '2-B',
    maxLength: 50,
    nullable: true,
  })
  NoInterior?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional({
    description: 'Número exterior',
    example: '100',
    maxLength: 50,
    nullable: true,
  })
  NoExterior?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(45)
  @ApiPropertyOptional({
    description: 'Código postal (string; conserva ceros a la izquierda)',
    example: '62000',
    maxLength: 45,
    nullable: true,
  })
  CP?: string | null;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt({ message: 'TipoRegistro debe ser un entero' })
  @IsIn([0, 1], {
    message: 'TipoRegistro solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({
    description: 'Tipo de registro: 0 = Local comercial, 1 = Vivienda',
    enum: [0, 1],
    example: 0,
    nullable: true,
  })
  TipoRegistro?: number | null;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt({ message: 'PredioObra debe ser un entero' })
  @IsIn([0, 1], {
    message: 'PredioObra solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({
    description:
      'Estado del predio: 0 = No está en construcción, 1 = En construcción',
    enum: [0, 1],
    example: 1,
    nullable: true,
  })
  PredioObra?: number | null;
}

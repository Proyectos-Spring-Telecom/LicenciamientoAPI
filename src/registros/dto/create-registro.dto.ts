import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Convierte cadena vacía de form-data a null. */
function emptyToNull({ value }: { value: unknown }): unknown {
  if (value === '' || value === undefined) return null;
  return value;
}

/** Convierte string numérico de form-data a number; vacío → undefined. */
function toNumber({ value }: { value: unknown }): unknown {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
}

/**
 * Solo convierte '0'/'1' (o 0/1) a número; cualquier otro valor
 * ('2', '-1', '0.5', 'true', '', etc.) se deja tal cual para que
 * @IsInt/@IsIn lo rechacen. No usar Boolean(value): '0' sería truthy.
 */
function toBinaryFlag({ value }: { value: unknown }): unknown {
  if (value === '0' || value === 0) return 0;
  if (value === '1' || value === 1) return 1;
  return value;
}

/**
 * DTO de alta de Registros (multipart/form-data).
 * Los nombres de propiedad coinciden con los campos del formulario (PascalCase).
 * No incluye Registro ni Estatus: el servicio los fija (null y 4).
 */
export class CreateRegistroDto {
  @Transform(toNumber)
  @IsNumber({}, { message: 'Latitud debe ser un número' })
  @IsNotEmpty({ message: 'Latitud es obligatoria' })
  @ApiProperty({
    description: 'Latitud del registro (obligatorio)',
    example: 18.9530959,
  })
  Latitud!: number;

  @Transform(toNumber)
  @IsNumber({}, { message: 'Longitud debe ser un número' })
  @IsNotEmpty({ message: 'Longitud es obligatoria' })
  @ApiProperty({
    description: 'Longitud del registro (obligatorio)',
    example: -99.2353385,
  })
  Longitud!: number;

  @Transform(toBinaryFlag)
  @IsInt({ message: 'TipoRegistro debe ser un entero' })
  @IsIn([0, 1], {
    message: 'TipoRegistro solo puede tener los valores 0 o 1',
  })
  @IsNotEmpty({ message: 'TipoRegistro es obligatorio' })
  @ApiProperty({
    description: 'Tipo de registro (obligatorio). Solo acepta 0 o 1.',
    enum: [0, 1],
    example: 1,
  })
  TipoRegistro!: number;

  @Transform(toBinaryFlag)
  @IsInt({ message: 'PredioObra debe ser un entero' })
  @IsIn([0, 1], {
    message: 'PredioObra solo puede tener los valores 0 o 1',
  })
  @IsNotEmpty({ message: 'PredioObra es obligatorio' })
  @ApiProperty({
    description: 'Predio / obra (obligatorio). Solo acepta 0 o 1.',
    enum: [0, 1],
    example: 1,
  })
  PredioObra!: number;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({ example: 'Morelos' })
  EntidadFederativa?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({ example: 'Cuernavaca' })
  Municipio?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional()
  Localidad?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional()
  Colonia?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional()
  Calle?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional()
  NoInterior?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional()
  NoExterior?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(45)
  @ApiPropertyOptional({ example: '62000' })
  CP?: string | null;
}

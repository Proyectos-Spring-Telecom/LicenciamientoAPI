import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateContactoDto } from './create-contacto.dto';
import { CreateContactoRepresentanteDto } from './create-contacto-representante.dto';

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

function toOptionalBinaryFlag({ value }: { value: unknown }): unknown {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return undefined;
  }
  if (value === '0' || value === 0) return 0;
  if (value === '1' || value === 1) return 1;
  return value;
}

function toOptionalTipoPersona({ value }: { value: unknown }): unknown {
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

function toOptionalDateString({ value }: { value: unknown }): unknown {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return undefined;
  }
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateLicenciaDto {
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(25)
  @ApiPropertyOptional()
  Registro?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(191)
  @ApiPropertyOptional()
  NombreComercial?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional()
  Giro?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional()
  LicenciaSuelo?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional()
  NombrePropietario?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional()
  ApellidoPaternoPropietario?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional()
  ApellidoMaternoPropietario?: string;

  @Transform(toOptionalTipoPersona)
  @IsOptional()
  @IsInt({ message: 'Licencias.TipoPersona debe ser un número entero.' })
  @IsIn([1, 2], {
    message:
      'Licencias.TipoPersona solo puede tener los valores 1 para persona física o 2 para persona moral.',
  })
  @ApiPropertyOptional({
    enum: [1, 2],
    example: 1,
    description: 'Tipo de persona: 1 = Persona física, 2 = Persona moral.',
  })
  TipoPersona?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(16)
  @ApiPropertyOptional()
  RFC?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @ApiPropertyOptional({
    maxLength: 200,
    example: 'Comercializadora Ejemplo, S.A. de C.V.',
    description:
      'Razón social de la persona moral asociada a la licencia.',
  })
  RazonSocial?: string;

  @Transform(toOptionalDateString)
  @IsOptional()
  @IsDateString({}, { message: 'FechaExpedicion debe ser una fecha válida' })
  @ApiPropertyOptional()
  FechaExpedicion?: string;

  @Transform(toOptionalDateString)
  @IsOptional()
  @IsDateString({}, { message: 'FechaRefrendo debe ser una fecha válida' })
  @ApiPropertyOptional()
  FechaRefrendo?: string;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt({ message: 'Estacionamiento debe ser un entero' })
  @IsIn([0, 1], {
    message: 'Estacionamiento solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({ enum: [0, 1] })
  Estacionamiento?: number;

  @Transform(toOptionalInt)
  @IsOptional()
  @IsInt({ message: 'Tipo debe ser un entero' })
  @ApiPropertyOptional()
  Tipo?: number;

  @Transform(toOptionalDateString)
  @IsOptional()
  @IsDateString({}, { message: 'FechaHora debe ser una fecha válida' })
  @ApiPropertyOptional()
  FechaHora?: string;

  /** Solo estructura de formulario; no es columna de Licencias. */
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateContactoDto)
  @ApiPropertyOptional({ type: CreateContactoDto })
  Contacto?: CreateContactoDto;

  /** Solo estructura de formulario; no es columna de Licencias. Relación física por IdRegistro. */
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateContactoRepresentanteDto)
  @ApiPropertyOptional({ type: CreateContactoRepresentanteDto })
  ContactoRepresentante?: CreateContactoRepresentanteDto;
}

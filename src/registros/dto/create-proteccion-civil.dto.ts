import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
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

export class CreateProteccionCivilDto {
  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt({ message: 'EsEmpresa debe ser un entero' })
  @IsIn([0, 1], {
    message: 'EsEmpresa solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({ enum: [0, 1] })
  EsEmpresa?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(191)
  @ApiPropertyOptional()
  RazonSocial?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(16)
  @ApiPropertyOptional()
  RFC?: string;

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
  @MaxLength(50)
  @ApiPropertyOptional()
  Telefono?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @ApiPropertyOptional()
  RegistroAcreditacion?: string;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt({ message: 'TienePrograma debe ser un entero' })
  @IsIn([0, 1], {
    message: 'TienePrograma solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({ enum: [0, 1] })
  TienePrograma?: number;

  /** Solo estructura de formulario; no es columna de ProteccionCivil. */
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateContactoRepresentanteDto)
  @ApiPropertyOptional({ type: CreateContactoRepresentanteDto })
  ContactoRepresentante?: CreateContactoRepresentanteDto;
}

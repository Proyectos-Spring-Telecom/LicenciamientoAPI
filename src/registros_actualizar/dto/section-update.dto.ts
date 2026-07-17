import { OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateSapacDto } from 'src/registros/dto/create-sapac.dto';
import { CreateCatastroDto } from 'src/registros/dto/create-catastro.dto';
import { CreateLicenciaDto } from 'src/registros/dto/create-licencia.dto';
import { CreateContactoDto } from 'src/registros/dto/create-contacto.dto';
import { CreateProteccionCivilDto } from 'src/registros/dto/create-proteccion-civil.dto';
import { CreateContactoRepresentanteDto } from 'src/registros/dto/create-contacto-representante.dto';

/**
 * Correo en PATCH: vacío → no actualizar.
 * Placeholders sin "@" (p. ej. "sin registro") → undefined (no 400, no sobrescribe).
 * Si contiene "@", se valida con @IsEmail.
 */
function toOptionalEmail({ value }: { value: unknown }): unknown {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return undefined;
  }
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed.includes('@')) {
    return undefined;
  }
  return trimmed;
}

export class UpdateSapacDto extends PartialType(CreateSapacDto) {}

export class UpdateCatastroDto extends PartialType(CreateCatastroDto) {}

export class UpdateContactoDto extends OmitType(PartialType(CreateContactoDto), [
  'Correo',
] as const) {
  @Transform(toOptionalEmail)
  @IsOptional()
  @IsEmail({}, { message: 'Correo debe ser un correo válido' })
  @MaxLength(50)
  Correo?: string;
}

export class UpdateContactoRepresentanteDto extends OmitType(
  PartialType(CreateContactoRepresentanteDto),
  ['Correo'] as const,
) {
  @Transform(toOptionalEmail)
  @IsOptional()
  @IsEmail({}, { message: 'Correo debe ser un correo válido' })
  @MaxLength(50)
  Correo?: string;
}

export class UpdateLicenciasDto extends OmitType(
  PartialType(CreateLicenciaDto),
  ['Contacto'] as const,
) {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateContactoDto)
  Contacto?: UpdateContactoDto;
}

export class UpdateProteccionCivilDto extends OmitType(
  PartialType(CreateProteccionCivilDto),
  ['ContactoRepresentante'] as const,
) {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateContactoRepresentanteDto)
  ContactoRepresentante?: UpdateContactoRepresentanteDto;
}

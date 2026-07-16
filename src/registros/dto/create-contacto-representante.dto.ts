import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
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

export class CreateContactoRepresentanteDto {
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
  @IsEmail({}, { message: 'Correo debe ser un correo válido' })
  @MaxLength(50)
  @ApiPropertyOptional()
  Correo?: string;
}

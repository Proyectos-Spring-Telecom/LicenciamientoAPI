import { OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { CreateLicenciaConstruccionDto } from 'src/registros/dto/create-licencia-construccion.dto';
import { UpdateCorresponsableDto } from './update-corresponsable.dto';

/**
 * LicenciaConstruccion parcial para PATCH (PredioObra = 1).
 * Todos los escalares son opcionales; Corresponsables usa DTO de actualización.
 */
export class UpdateLicenciaConstruccionDto extends OmitType(
  PartialType(CreateLicenciaConstruccionDto),
  ['Corresponsables'] as const,
) {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateCorresponsableDto)
  Corresponsables?: UpdateCorresponsableDto[];
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateCorresponsableDto } from './create-corresponsable.dto';

function emptyToNull({ value }: { value: unknown }): unknown {
  if (value === '' || value === undefined) return null;
  return value;
}

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}

/** Solo '0'/'1' → 0/1; vacío → undefined; resto intacto para fallar validación. */
function toOptionalBinaryFlag({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === '0' || value === 0) return 0;
  if (value === '1' || value === 1) return 1;
  return value;
}

/** Catálogo 1–4. No convierte boolean ni texto libre. */
function toOptionalTipoSolicitudLicencia({
  value,
}: {
  value: unknown;
}): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === '1' || value === 1) return 1;
  if (value === '2' || value === 2) return 2;
  if (value === '3' || value === 3) return 3;
  if (value === '4' || value === 4) return 4;

  return value;
}

function toOptionalDecimal({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return value;
  return n;
}

/**
 * DTO de LicenciaConstruccion (campos escalares).
 * Las firmas NO van aquí: se reciben como archivos multipart.
 */
export class CreateLicenciaConstruccionDto {
  @Transform(toOptionalTipoSolicitudLicencia)
  @IsOptional()
  @IsInt({ message: 'TipoSolicitudLicencia debe ser un entero' })
  @IsIn([1, 2, 3, 4], {
    message: 'LicenciaConstruccion.TipoSolicitudLicencia debe ser 1, 2, 3 o 4',
  })
  @ApiPropertyOptional({
    enum: [1, 2, 3, 4],
    example: 1,
    description:
      'Tipo de solicitud de licencia: 1 = Obra nueva, 2 = Licencia sencilla, 3 = Regularización y/o aprobación, cambio de uso, 4 = Otros, canalización vía pública',
  })
  TipoSolicitudLicencia?: number;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  DescripcionProyecto?: string | null;

  @Transform(toOptionalDecimal)
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'SuperficieTerrenoM2 debe ser numérico con máximo 2 decimales' },
  )
  @Min(0, { message: 'SuperficieTerrenoM2 debe ser mayor o igual a 0' })
  @Max(9999999999.99, {
    message: 'SuperficieTerrenoM2 excede el máximo permitido',
  })
  @ApiPropertyOptional({ example: 120.5 })
  SuperficieTerrenoM2?: number;

  @Transform(toOptionalDecimal)
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'SuperficieTerrenoObraM2 debe ser numérico con máximo 2 decimales',
    },
  )
  @Min(0, { message: 'SuperficieTerrenoObraM2 debe ser mayor o igual a 0' })
  @Max(9999999999.99, {
    message: 'SuperficieTerrenoObraM2 excede el máximo permitido',
  })
  @ApiPropertyOptional({ example: 80.25 })
  SuperficieTerrenoObraM2?: number;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  DescripcionSistemaConstructivo?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(191)
  @ApiPropertyOptional()
  NombrePropietario?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(191)
  @ApiPropertyOptional()
  DomicilioNotificacion?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(16)
  @ApiPropertyOptional()
  RFC?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(191)
  @ApiPropertyOptional()
  NombreDRO?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional()
  NoRegLicenciaConstruccion?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @ApiPropertyOptional()
  CedulaProfesional?: string | null;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsDateString({}, { message: 'Fecha debe ser una fecha válida' })
  @ApiPropertyOptional({ example: '2026-07-16T12:00:00.000Z' })
  Fecha?: string;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional()
  NumeroExpediente?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiPropertyOptional()
  NumeroControl?: string | null;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt({ message: 'SeguimientoObra debe ser un entero' })
  @IsIn([0, 1], {
    message: 'SeguimientoObra solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({ enum: [0, 1] })
  SeguimientoObra?: number;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt()
  @IsIn([0, 1], {
    message: 'ConstanciaAlineamiento solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({ enum: [0, 1] })
  ConstanciaAlineamiento?: number;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt()
  @IsIn([0, 1], {
    message: 'LicenciaUsoSuelo solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({ enum: [0, 1] })
  LicenciaUsoSuelo?: number;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt()
  @IsIn([0, 1], {
    message: 'PlanoAutorizado solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({ enum: [0, 1] })
  PlanoAutorizado?: number;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt()
  @IsIn([0, 1], {
    message: 'LicenciaFraccionamiento solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({ enum: [0, 1] })
  LicenciaFraccionamiento?: number;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt()
  @IsIn([0, 1], {
    message: 'Escrituras solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({ enum: [0, 1] })
  Escrituras?: number;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt()
  @IsIn([0, 1], {
    message: 'FactibilidadAguaPotable solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({ enum: [0, 1] })
  FactibilidadAguaPotable?: number;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt()
  @IsIn([0, 1], {
    message: 'RecibosPagoPredial solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({ enum: [0, 1] })
  RecibosPagoPredial?: number;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt()
  @IsIn([0, 1], {
    message: 'RecibosMunicipales solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({ enum: [0, 1] })
  RecibosMunicipales?: number;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt()
  @IsIn([0, 1], {
    message: 'PlanoArquitectonicos solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({ enum: [0, 1] })
  PlanoArquitectonicos?: number;

  @Transform(toOptionalBinaryFlag)
  @IsOptional()
  @IsInt()
  @IsIn([0, 1], {
    message: 'Otros solo puede tener los valores 0 o 1',
  })
  @ApiPropertyOptional({ enum: [0, 1] })
  Otros?: number;

  /** Solo estructura de formulario 1:N; no es columna de LicenciaConstruccion. */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateCorresponsableDto)
  @ApiPropertyOptional({ type: [CreateCorresponsableDto] })
  Corresponsables?: CreateCorresponsableDto[];
}

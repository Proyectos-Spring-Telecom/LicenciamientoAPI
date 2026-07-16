import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, Matches } from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * Body de POST /registros/por-rango-fechas.
 * Solo acepta fechas calendario YYYY-MM-DD (sin hora ni zona).
 */
export class GetRegistrosByDateRangeDto {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-07-01',
    description: 'Fecha inicial del rango en formato YYYY-MM-DD.',
  })
  @Transform(trimString)
  @IsNotEmpty({ message: 'fechaInicio es obligatoria.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fechaInicio debe ser una fecha válida en formato YYYY-MM-DD.',
  })
  @IsDateString(
    { strict: true },
    {
      message: 'fechaInicio debe ser una fecha válida en formato YYYY-MM-DD.',
    },
  )
  fechaInicio!: string;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-07-16',
    description: 'Fecha final del rango en formato YYYY-MM-DD.',
  })
  @Transform(trimString)
  @IsNotEmpty({ message: 'fechaFin es obligatoria.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fechaFin debe ser una fecha válida en formato YYYY-MM-DD.',
  })
  @IsDateString(
    { strict: true },
    {
      message: 'fechaFin debe ser una fecha válida en formato YYYY-MM-DD.',
    },
  )
  fechaFin!: string;
}

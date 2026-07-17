import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';

/**
 * Body de POST /dashboard/captura-periodo.
 * Conserva los nombres del contrato existente: fechaInicial / fechaFinal.
 */
export class CapturaPeriodoRequestDto {
  @ApiProperty({
    example: '2026-07-01',
    format: 'date',
    description: 'Fecha inicial inclusiva del periodo en formato YYYY-MM-DD.',
  })
  @IsNotEmpty({ message: 'fechaInicial es obligatoria' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fechaInicial debe tener formato YYYY-MM-DD',
  })
  @IsDateString(
    { strict: true },
    { message: 'fechaInicial debe ser una fecha válida' },
  )
  fechaInicial!: string;

  @ApiProperty({
    example: '2026-07-10',
    format: 'date',
    description: 'Fecha final inclusiva del periodo en formato YYYY-MM-DD.',
  })
  @IsNotEmpty({ message: 'fechaFinal es obligatoria' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fechaFinal debe tener formato YYYY-MM-DD',
  })
  @IsDateString(
    { strict: true },
    { message: 'fechaFinal debe ser una fecha válida' },
  )
  fechaFinal!: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'Identificador del grupo de la visita vigente del registro.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idGrupo?: number;

  @ApiPropertyOptional({
    example: 25,
    description:
      'Identificador del capturista de la visita vigente del registro.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idCapturista?: number;
}

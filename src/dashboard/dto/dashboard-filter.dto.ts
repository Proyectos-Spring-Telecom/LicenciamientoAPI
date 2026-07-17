import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Matches, Min } from 'class-validator';

export class DashboardFilterDto {
  @ApiPropertyOptional({
    example: '2026-07-01',
    description: 'Fecha inicial inclusiva en formato YYYY-MM-DD.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fechaInicial debe tener formato YYYY-MM-DD',
  })
  @IsDateString(
    { strict: true },
    { message: 'fechaInicial debe ser una fecha válida' },
  )
  fechaInicial?: string;

  @ApiPropertyOptional({
    example: '2026-07-16',
    description: 'Fecha final inclusiva en formato YYYY-MM-DD.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'fechaFinal debe tener formato YYYY-MM-DD',
  })
  @IsDateString(
    { strict: true },
    { message: 'fechaFinal debe ser una fecha válida' },
  )
  fechaFinal?: string;

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

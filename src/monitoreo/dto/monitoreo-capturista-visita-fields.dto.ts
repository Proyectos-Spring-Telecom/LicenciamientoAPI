import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Campos planos de CapturistaVisita + Usuarios + Grupos
 * para GET /monitoreo/:idRegistro (camelCase, nullable).
 */
export class MonitoreoCapturistaVisitaFieldsDto {
  @ApiPropertyOptional({ nullable: true, example: 4 })
  idCapturistaVisita: number | null;

  @ApiPropertyOptional({ nullable: true, example: 4 })
  idRegistroCapturistaVisita: number | null;

  @ApiPropertyOptional({ nullable: true, example: 15 })
  idCapturista: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'Juan' })
  nombreCapturista: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Pérez' })
  apellidoPaternoCapturista: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'López' })
  apellidoMaternoCapturista: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Juan Pérez López' })
  nombreCompletoCapturista: string | null;

  @ApiPropertyOptional({ nullable: true, example: 2 })
  idGrupoCapturista: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'Grupo Norte' })
  nombreGrupoCapturista: string | null;

  @ApiPropertyOptional({ nullable: true, example: 8 })
  idSupervisor: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'María' })
  nombreSupervisor: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Torres' })
  apellidoPaternoSupervisor: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'García' })
  apellidoMaternoSupervisor: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'María Torres García' })
  nombreCompletoSupervisor: string | null;

  @ApiPropertyOptional({ nullable: true, example: 3 })
  idGrupoSupervisor: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'Supervisores Centro' })
  nombreGrupoSupervisor: string | null;

  @ApiPropertyOptional({ nullable: true, example: 2 })
  idGrupoCapturistaVisita: number | null;

  @ApiPropertyOptional({ nullable: true })
  fechaHoraCapturistaVisita: Date | null;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegistroFotoResponseDto } from 'src/common/dto/registro-foto-response.dto';

/**
 * Documentación Swagger del detalle GET /registros/:idRegistro.
 * La respuesta real se envuelve en `{ data }` (igual que Monitoreo)
 * e incluye relaciones anidadas según PredioObra (Sapac, Licencias, etc.).
 */
export class RegistroDetalleResponseDto {
  @ApiProperty({ example: 25 })
  id: number;

  @ApiPropertyOptional({ nullable: true, example: 'REG-00025' })
  registro: string | null;

  @ApiPropertyOptional({ nullable: true })
  latitud: number | null;

  @ApiPropertyOptional({ nullable: true })
  longitud: number | null;

  @ApiPropertyOptional({ nullable: true })
  entidadFederativa: string | null;

  @ApiPropertyOptional({ nullable: true })
  municipio: string | null;

  @ApiPropertyOptional({ nullable: true })
  localidad: string | null;

  @ApiPropertyOptional({ nullable: true })
  colonia: string | null;

  @ApiPropertyOptional({ nullable: true })
  calle: string | null;

  @ApiPropertyOptional({ nullable: true })
  noInterior: string | null;

  @ApiPropertyOptional({ nullable: true })
  noExterior: string | null;

  @ApiPropertyOptional({ nullable: true })
  cp: string | null;

  @ApiPropertyOptional({ nullable: true })
  tipoRegistro: number | null;

  @ApiPropertyOptional({ nullable: true, example: 0 })
  predioObra: number | null;

  @ApiPropertyOptional({ nullable: true, example: 4 })
  estatus: number | null;

  @ApiPropertyOptional({ nullable: true })
  fechaCreacion: Date | null;

  @ApiPropertyOptional({ nullable: true })
  fechaActualizacion: Date | null;

  @ApiPropertyOptional({ nullable: true, example: 12 })
  idCapturistaVisita: number | null;

  @ApiPropertyOptional({ nullable: true, example: 25 })
  idRegistroCapturistaVisita: number | null;

  @ApiPropertyOptional({ nullable: true, example: 2 })
  idGrupoCapturistaVisita: number | null;

  @ApiPropertyOptional({ nullable: true })
  fechaHoraCapturistaVisita: Date | null;

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

  @ApiProperty({
    type: [RegistroFotoResponseDto],
    description: 'Fotografías con IdTipoFoto 6, 7 u 8.',
  })
  fotos: RegistroFotoResponseDto[];
}

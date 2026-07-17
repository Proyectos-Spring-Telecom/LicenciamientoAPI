import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Ítem plano del listado GET /monitoreo.
 * Atributos de Registros + Licencias en el mismo nivel (camelCase).
 */
export class MonitoreoListadoItemDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiPropertyOptional({ nullable: true, example: null })
  registro: string | null;

  @ApiPropertyOptional({ nullable: true, example: 18.952825 })
  latitud: number | null;

  @ApiPropertyOptional({ nullable: true, example: -99.2356916 })
  longitud: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'Morelos' })
  entidadFederativa: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Cuernavaca' })
  municipio: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Cuernavaca' })
  localidad: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'San Cristobal' })
  colonia: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'C. San Cristóbal' })
  calle: string | null;

  @ApiPropertyOptional({ nullable: true, example: 's/n' })
  noInterior: string | null;

  @ApiPropertyOptional({ nullable: true, example: '201' })
  noExterior: string | null;

  @ApiPropertyOptional({ nullable: true, example: '62230' })
  cp: string | null;

  @ApiPropertyOptional({ nullable: true, example: 0 })
  tipoRegistro: number | null;

  @ApiPropertyOptional({ nullable: true, example: 0 })
  predioObra: number | null;

  @ApiPropertyOptional({ nullable: true, example: 4 })
  estatus: number | null;

  @ApiPropertyOptional({ nullable: true })
  fechaCreacion: Date | null;

  @ApiPropertyOptional({ nullable: true })
  fechaActualizacion: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 3,
    description: 'Licencias.Id',
  })
  idLicencia: number | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 4,
    description: 'Licencias.IdRegistro',
  })
  idRegistroLicencia: number | null;

  @ApiPropertyOptional({
    nullable: true,
    example: '02062026',
    description: 'Licencias.Registro',
  })
  registroLicencia: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'BBVA' })
  nombreComercial: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'BANCO' })
  giro: string | null;

  @ApiPropertyOptional({ nullable: true })
  licenciaSuelo: string | null;

  @ApiPropertyOptional({ nullable: true })
  nombrePropietario: string | null;

  @ApiPropertyOptional({ nullable: true })
  apellidoPaternoPropietario: string | null;

  @ApiPropertyOptional({ nullable: true })
  apellidoMaternoPropietario: string | null;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  tipoPersona: number | null;

  @ApiPropertyOptional({ nullable: true, example: 'TOC012026' })
  rfc: string | null;

  @ApiPropertyOptional({ nullable: true })
  fechaExpedicion: Date | null;

  @ApiPropertyOptional({ nullable: true })
  fechaRefrendo: Date | null;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  estacionamiento: number | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 2,
    description: 'Licencias.Tipo',
  })
  tipoLicencia: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Licencias.FechaHora',
  })
  fechaHoraLicencia: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Licencias.FechaCreacion',
  })
  fechaCreacionLicencia: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Licencias.FechaActualizacion',
  })
  fechaActualizacionLicencia: Date | null;
}

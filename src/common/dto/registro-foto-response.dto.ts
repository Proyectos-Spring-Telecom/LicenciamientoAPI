import { ApiProperty } from '@nestjs/swagger';

/**
 * Fotografía de registro (tipos 6, 7 u 8) en listados/detalle de
 * Monitoreo y Registros. camelCase; ruta sin transformar.
 */
export class RegistroFotoResponseDto {
  @ApiProperty({ example: 21 })
  id: number;

  @ApiProperty({ example: 4, nullable: true })
  idRegistro: number | null;

  @ApiProperty({
    example: '/registros/data/foto-1.jpg',
    nullable: true,
  })
  ruta: string | null;

  @ApiProperty({
    example: '2026-07-17T10:30:00.000Z',
    nullable: true,
  })
  fechaHora: Date | null;

  @ApiProperty({
    enum: [6, 7, 8],
    example: 6,
    description: 'Solo se incluyen tipos 6, 7 y 8.',
  })
  idTipoFoto: number;
}

import { ApiProperty } from '@nestjs/swagger';

export class DashboardRegistroCapturistaDto {
  @ApiProperty({
    example: 25,
    description: 'Identificador del capturista obtenido de CapturistaVisita.',
  })
  idCapturista: number;

  @ApiProperty({
    example: 'Juan',
    nullable: true,
  })
  nombre: string | null;

  @ApiProperty({
    example: 'Pérez',
    nullable: true,
  })
  apellidoPaterno: string | null;

  @ApiProperty({
    example: 'López',
    nullable: true,
  })
  apellidoMaterno: string | null;

  @ApiProperty({
    example: 'Juan Pérez López',
    nullable: true,
    description:
      'Nombre completo construido sin valores nulos ni espacios duplicados.',
  })
  nombreCompleto: string | null;

  @ApiProperty({
    example: 3,
    nullable: true,
    description:
      'Identificador del grupo obtenido desde la visita vigente de CapturistaVisita.',
  })
  idGrupo: number | null;

  @ApiProperty({
    example: 'Grupo Centro',
    nullable: true,
    description:
      'Nombre del grupo relacionado con CapturistaVisita.IdGrupo. Es null cuando la visita no tiene grupo o el grupo ya no existe.',
  })
  grupo: string | null;

  @ApiProperty({
    example: 48,
    description:
      'Cantidad de registros asociados al capturista y grupo desde el primer registro hasta la fecha actual.',
  })
  totalRegistros: number;
}

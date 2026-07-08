import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty } from 'class-validator';

export class UpdateRolEstatusDto {
  @IsNotEmpty()
  @IsInt({ message: 'Estatus debe ser 0 ó 1' })
  @IsIn([0, 1], { message: 'Solo puede ser 0 ó 1' })
  @ApiProperty({ description: 'Estatus del rol (1 activo, 0 inactivo)', example: 1 })
  estatus: number = 1;
}

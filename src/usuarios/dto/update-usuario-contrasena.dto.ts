import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_RULES_MESSAGE =
  'La contraseña debe tener entre 6 y 12 caracteres, e incluir al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (@$!%*?&.)';

const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{6,12}$/;

export class UpdateUsuarioContrasena {
  @IsString()
  @IsNotEmpty({ message: 'El Password es obligatorio' })
  @ApiProperty({
    description: 'Contraseña actual del usuario',
    example: 'P@ssw0rd.',
  })
  passwordActual: string;

  @IsString()
  @IsNotEmpty({ message: 'El Password es obligatorio' })
  @MinLength(6, { message: 'El Password debe tener al menos 6 caracteres' })
  @MaxLength(12, { message: 'El Password no puede exceder 12 caracteres' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_RULES_MESSAGE })
  @ApiProperty({
    description:
      'Nueva contraseña (6-12 caracteres; 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial)',
    example: 'P@ssw0rd.',
  })
  passwordNueva: string;

  @IsString()
  @IsNotEmpty({ message: 'El Password es obligatorio' })
  @MinLength(6, { message: 'El Password debe tener al menos 6 caracteres' })
  @MaxLength(12, { message: 'El Password no puede exceder 12 caracteres' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_RULES_MESSAGE })
  @ApiProperty({
    description: 'Confirmación de la nueva contraseña (mismas reglas)',
    example: 'P@ssw0rd.',
  })
  passwordNuevaConfirmacion: string;
}

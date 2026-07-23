import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_RULES_MESSAGE =
  'La contraseña debe tener entre 6 y 12 caracteres, e incluir al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (@$!%*?&.!)';

/** 6–12 chars: mayúscula, minúscula, número y carácter especial. */
const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.!])[A-Za-z\d@$!%*?&.!]{6,12}$/;

/**
 * Body para restablecer contraseña tras verificar el código de recuperación.
 * El usuario se toma del JWT (`request.user.userId`), no del body.
 */
export class CambiarPasswordRecuperacionDto {
  @IsString()
  @IsNotEmpty({ message: 'passwordNueva es obligatoria' })
  @MinLength(6, {
    message: 'passwordNueva debe tener al menos 6 caracteres',
  })
  @MaxLength(12, {
    message: 'passwordNueva no puede exceder 12 caracteres',
  })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_RULES_MESSAGE })
  @ApiProperty({
    description:
      'Nueva contraseña (6-12; 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial)',
    example: 'P@ssw0rd!',
  })
  passwordNueva!: string;

  @IsString()
  @IsNotEmpty({ message: 'passwordConfirmacion es obligatoria' })
  @MinLength(6, {
    message: 'passwordConfirmacion debe tener al menos 6 caracteres',
  })
  @MaxLength(12, {
    message: 'passwordConfirmacion no puede exceder 12 caracteres',
  })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_RULES_MESSAGE })
  @ApiProperty({
    description: 'Confirmación de la nueva contraseña (mismas reglas)',
    example: 'P@ssw0rd!',
  })
  passwordConfirmacion!: string;
}

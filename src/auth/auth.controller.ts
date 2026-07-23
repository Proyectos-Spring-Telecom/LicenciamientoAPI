import {
  Controller,
  Post,
  Body,
  HttpCode,
  UseGuards,
  Get,
  Request,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { LoginAuthConfirmacionDto } from './dto/login-confirmacion.dto';
import { LoginAuthResetDto } from './dto/login-recuperacion.dto';
import { CambiarPasswordRecuperacionDto } from './dto/cambiar-password-recuperacion.dto';
import { CodigoPasajeroAutenticacion } from './dto/login-autenticacion.dto';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@ApiTags('Autenticación')
@ApiBearerAuth('bearer-token')
@Controller('login')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('usuario/recuperar/acceso')
  @ApiOperation({
    summary: 'Recuperar acceso (flujo existente)',
    description:
      'Conserva el comportamiento actual: genera código, emite token JWT y envía el correo de restablecimiento con enlace.',
  })
  async email(@Body() loginAuthConfirmacionDto: LoginAuthConfirmacionDto) {
    return await this.authService.recuperarContrasena(loginAuthConfirmacionDto);
  }

  @Post('usuario/recuperar/acceso/codigo')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Genera y envía un código de recuperación de acceso',
    description: `
Genera un código temporal con la misma lógica del flujo actual, lo almacena en
\`CodigoAutenticacion\` y lo envía al correo asociado al usuario (\`UserName\`).

El código **no** se incluye en la respuesta HTTP; solo en el cuerpo del correo.
La respuesta es genérica para no enumerar usuarios.
`,
  })
  @ApiBody({ type: LoginAuthConfirmacionDto })
  @ApiOkResponse({
    description:
      'Solicitud procesada. Si la cuenta existe y tiene correo, se envía el código.',
    schema: {
      example: {
        status: 'success',
        message:
          'Si la cuenta existe y tiene un correo asociado, se enviará un código de recuperación.',
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de solicitud inválidos.',
  })
  @ApiResponse({
    status: 500,
    description: 'Error al enviar el correo tras guardar el código.',
  })
  async recuperarAccesoConCodigo(
    @Body() loginAuthConfirmacionDto: LoginAuthConfirmacionDto,
  ) {
    return await this.authService.recuperarAccesoConCodigoPorCorreo(
      loginAuthConfirmacionDto,
    );
  }

  // @Post('recuperar/confirmacion')
  // async recuperacionConfirmacion(
  //   @Body() loginAuthConfirmacionDto: LoginAuthConfirmacionDto,
  // ) {
  //   return await this.authService.recuperarConfirmacion(
  //     loginAuthConfirmacionDto,
  //   );
  // }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logoutRefresh(refreshTokenDto.refreshToken);
  }

  @Post()
  @HttpCode(200)
  async login(@Body() loginAuthDto: LoginAuthDto) {
    return this.authService.signIn(loginAuthDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req) {
    return this.authService.getMe(req.user.userId);
  }

  @Post('cambiar/accesso')
  @UseGuards(JwtAuthGuard)
  async resetPassword(@Body() loginAuthResetDto: LoginAuthResetDto) {
    return await this.authService.resetPassword(loginAuthResetDto);
  }

  @Post('usuario/recuperar/cambiar/password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Restablece la contraseña con el token de recuperación',
    description: `
Independiente de \`POST /login/cambiar/accesso\`.
Toma el \`userId\` del JWT (\`Authorization: Bearer\`) emitido por \`PATCH /login/verify\`
y actualiza la contraseña del usuario autenticado.

Body:
- \`passwordNueva\`
- \`passwordConfirmacion\`

Reglas: 6–12 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.
`,
  })
  @ApiBody({ type: CambiarPasswordRecuperacionDto })
  @ApiOkResponse({
    description: 'Contraseña actualizada correctamente.',
    schema: {
      example: {
        status: 'success',
        message: 'La contraseña ha sido actualizada exitosamente.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validación fallida o las contraseñas no coinciden.',
  })
  @ApiResponse({ status: 401, description: 'Token ausente o inválido.' })
  async cambiarPasswordPorRecuperacion(
    @Body() dto: CambiarPasswordRecuperacionDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return await this.authService.cambiarPasswordPorToken(req.user.userId, dto);
  }

  @Patch('verify')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verifica el código de recuperación y emite un token',
    description: `
Valida el código de autenticación de recuperación de contraseña.
Si es válido y vigente, lo marca como usado y responde con un JWT con la misma
vigencia de \`JWT_CONFIRMACION\` (mismo criterio que el flujo de recuperar acceso).

No confirma el correo ni habilita al usuario.
`,
  })
  @ApiBody({ type: CodigoPasajeroAutenticacion })
  @ApiOkResponse({
    description: 'Código válido. Devuelve el token de restablecimiento.',
    schema: {
      example: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Código inválido, ya usado o expirado.',
  })
  async verifyUser(
    @Body() codigoPasajeroAutenticacion: CodigoPasajeroAutenticacion,
  ) {
    return await this.authService.verifyUser(codigoPasajeroAutenticacion);
  }
}

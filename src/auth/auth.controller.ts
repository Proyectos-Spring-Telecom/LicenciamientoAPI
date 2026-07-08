import {
  Controller,
  Post,
  Body,
  HttpCode,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { LoginAuthConfirmacionDto } from './dto/login-confirmacion.dto';
import { LoginAuthResetDto } from './dto/login-recuperacion.dto';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Autenticación')
@ApiBearerAuth('bearer-token')
@Controller('login')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('usuario/recuperar/acceso')
  async email(@Body() loginAuthConfirmacionDto: LoginAuthConfirmacionDto) {
    return await this.authService.recuperarContrasena(loginAuthConfirmacionDto);
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

  // @Patch('verify')
  // @HttpCode(200)
  // async verifyUser(
  //   @Body() codigoPasajeroAutenticacion: CodigoPasajeroAutenticacion,
  // ) {
  //   return await this.authService.verifyUser(codigoPasajeroAutenticacion);
  // }
}

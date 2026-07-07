import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { BitacoraLoggerService } from './bitacora.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApiResponseCommon } from 'src/common/ApiResponse';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Bitácora')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(1, 2, 3) // Todos los roles pueden acceder a la bitácora
@Controller('bitacora')
export class BitacoraController {
  constructor(private readonly bitacoraService: BitacoraLoggerService) {}

  @Get('list') //Obseleto
  async findAllListBitacora(@Request() req): Promise<ApiResponseCommon> {
    const idGrupo = req.user.idGrupo;
    const rol = req.user.rol;
    return await this.bitacoraService.findAllListBitacora(+idGrupo, +rol);
  }

  @Get(':page/:limit')
  findAll(
    @Param('page', ParseIntPipe) page: number,
    @Param('limit', ParseIntPipe) limit: number,
    @Request() req,
  ): Promise<ApiResponseCommon> {
    const idGrupo = req.user.idGrupo;
    const rol = req.user.rol;
    return this.bitacoraService.findAll(+idGrupo, +rol, page, limit);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.bitacoraService.findOne(id);
  }
}

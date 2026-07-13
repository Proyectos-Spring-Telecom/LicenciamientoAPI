import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Request,
  Put,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-role.dto';
import { ApiResponseCommon } from 'src/common/ApiResponse';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { RolesGuard } from 'src/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UpdateRolEstatusDto } from './dto/update-rol.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Roles')
@ApiBearerAuth('bearer-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(4)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Post()
  @HttpCode(201)
  create(@Body() createRoleDto: CreateRolDto, @Request() req) {
    const idUser = req.user.userId;
    return this.rolesService.create(idUser, createRoleDto);
  }

  @Get('list')
  async findAllList(@Request() req): Promise<ApiResponseCommon> {
    const rol = req.user.rol;
    return await this.rolesService.findAllList(+rol);
  }

  @Get(':page/:limit')
  async findAll(
    @Param('page', ParseIntPipe) page: number,
    @Param('limit', ParseIntPipe) limit: number,
    @Request() req,
  ): Promise<ApiResponseCommon> {
    const rol = req.user.rol;
    return await this.rolesService.findAll(+rol, page, limit);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Put()
  @HttpCode(200)
  update(@Body() updateRolDto: UpdateRolDto, @Request() req) {
    const idUser = req.user.userId;
    return this.rolesService.update(idUser, updateRolDto);
  }

  @Patch('estatus/:id')
  async updateEstatus(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateRolEstatusDto: UpdateRolEstatusDto,
  ) {
    const idUser = req.user.userId;
    return await this.rolesService.updateEstatus(
      id,
      idUser,
      updateRolEstatusDto,
    );
  }

  @Delete(':id')
  @Roles(4)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const idUser = req.user.userId;
    return this.rolesService.remove(id, idUser);
  }
}

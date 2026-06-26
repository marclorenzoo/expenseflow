import {
  Controller,
  UseGuards,
  Req,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Crea un nuevo grupo' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Viaje a Barcelona' },
        description: {
          type: 'string',
          example: 'Gastos del finde en Barcelona',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Grupo creado.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  createGroup(
    @Req() req: any,
    @Body() body: { name: string; description?: string },
  ) {
    return this.groupsService.create(req.user.id, body.name, body.description);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Añade un miembro al grupo por email' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'luis.martin@example.com' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Miembro añadido.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos sobre el grupo.' })
  @ApiResponse({ status: 404, description: 'Grupo o usuario no encontrado.' })
  addMember(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { email: string },
  ) {
    return this.groupsService.addMember(id, body.email, req.user.id);
  }

  @Post(':id/image')
  @ApiOperation({
    summary: 'Sube y actualiza la imagen del grupo (JPEG/PNG/WebP, máx 2 MB)',
  })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Imagen del grupo actualizada.' })
  @ApiResponse({
    status: 400,
    description: 'Archivo ausente o tipo no permitido.',
  })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos sobre el grupo.' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Solo se permiten imágenes JPEG, PNG o WebP',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadGroupImage(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'groups');
    fs.mkdirSync(uploadDir, { recursive: true });

    const outputPath = path.join(uploadDir, `${id}.webp`);
    await sharp(file.buffer)
      .resize(200, 200, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(outputPath);

    const imageUrl = `/uploads/groups/${id}.webp`;
    return this.groupsService.updateImage(id, req.user.id, imageUrl);
  }

  @Delete(':id/image')
  @ApiOperation({ summary: 'Elimina la imagen del grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({ status: 200, description: 'Imagen del grupo eliminada.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos sobre el grupo.' })
  async deleteGroupImage(@Param('id') id: string, @Req() req: any) {
    const filePath = path.join(
      process.cwd(),
      'uploads',
      'groups',
      `${id}.webp`,
    );
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return this.groupsService.deleteImage(id, req.user.id);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Expulsa a un miembro del grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiParam({ name: 'userId', description: 'ID del usuario a expulsar' })
  @ApiResponse({ status: 200, description: 'Miembro expulsado.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos sobre el grupo.' })
  @ApiResponse({ status: 404, description: 'Grupo o miembro no encontrado.' })
  removeMember(
    @Req() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.groupsService.removeMember(id, userId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Lista los grupos del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de grupos del usuario.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  getGroups(@Req() req: any) {
    return this.groupsService.findAllByUser(req.user.id);
  }

  @Get(':id/balances')
  @ApiOperation({ summary: 'Devuelve los balances de deudas del grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({ status: 200, description: 'Balances calculados del grupo.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({
    status: 403,
    description: 'El usuario no pertenece al grupo.',
  })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado.' })
  getBalances(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.getBalances(id, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Devuelve el detalle de un grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({ status: 200, description: 'Detalle del grupo.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({
    status: 403,
    description: 'El usuario no pertenece al grupo.',
  })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado.' })
  getGroupById(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza nombre y descripción de un grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Viaje a Barcelona' },
        description: {
          type: 'string',
          example: 'Gastos del finde en Barcelona',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Grupo actualizado.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos sobre el grupo.' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado.' })
  updateGroup(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { name: string; description?: string },
  ) {
    return this.groupsService.update(
      id,
      req.user.id,
      body.name,
      body.description,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina un grupo' })
  @ApiParam({ name: 'id', description: 'ID del grupo' })
  @ApiResponse({ status: 200, description: 'Grupo eliminado.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos sobre el grupo.' })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado.' })
  deleteGroup(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.delete(id, req.user.id);
  }
}

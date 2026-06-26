import {
  Controller,
  Get,
  UseGuards,
  Req,
  Patch,
  Body,
  Post,
  Delete,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Devuelve el perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  getProfile(@Req() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Devuelve las estadísticas del usuario' })
  @ApiResponse({ status: 200, description: 'Estadísticas del usuario.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  getStats(@Req() req: any) {
    return this.usersService.getStats(req.user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualiza el nombre del perfil' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Ana García' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Perfil actualizado.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  updateProfile(@Req() req: any, @Body() body: { name: string }) {
    return this.usersService.updateProfile(req.user.id, body.name);
  }

  @Post('me/image')
  @ApiOperation({
    summary: 'Sube y actualiza la imagen de perfil (JPEG/PNG/WebP, máx 2 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Imagen de perfil actualizada.' })
  @ApiResponse({
    status: 400,
    description: 'Archivo ausente o tipo no permitido.',
  })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
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
  async uploadProfileImage(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');

    const userId = req.user.id;
    const uploadDir = path.join(process.cwd(), 'uploads', 'users');
    fs.mkdirSync(uploadDir, { recursive: true });

    const outputPath = path.join(uploadDir, `${userId}.webp`);
    await sharp(file.buffer)
      .resize(200, 200, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(outputPath);

    const imageUrl = `/uploads/users/${userId}.webp`;
    return this.usersService.updateImage(userId, imageUrl);
  }

  @Delete('me/image')
  @ApiOperation({ summary: 'Elimina la imagen de perfil' })
  @ApiResponse({ status: 200, description: 'Imagen de perfil eliminada.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  async deleteProfileImage(@Req() req: any) {
    const userId = req.user.id;
    const filePath = path.join(
      process.cwd(),
      'uploads',
      'users',
      `${userId}.webp`,
    );
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return this.usersService.deleteImage(userId);
  }
}

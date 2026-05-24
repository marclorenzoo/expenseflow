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
import { memoryStorage } from 'multer';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getProfile(@Req() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  updateProfile(@Req() req: any, @Body() body: { name: string }) {
    return this.usersService.updateProfile(req.user.id, body.name);
  }

  @Post('me/image')
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

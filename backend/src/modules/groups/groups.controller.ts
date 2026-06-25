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
import { memoryStorage } from 'multer';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Post()
  createGroup(
    @Req() req: any,
    @Body() body: { name: string; description?: string },
  ) {
    return this.groupsService.create(req.user.id, body.name, body.description);
  }

  @Post(':id/members')
  addMember(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { email: string },
  ) {
    return this.groupsService.addMember(id, body.email, req.user.id);
  }

  @Post(':id/image')
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
  removeMember(
    @Req() req: any,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.groupsService.removeMember(id, userId, req.user.id);
  }

  @Get()
  getGroups(@Req() req: any) {
    return this.groupsService.findAllByUser(req.user.id);
  }

  @Get(':id/balances')
  getBalances(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.getBalances(id, req.user.id);
  }

  @Get(':id')
  getGroupById(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.findOne(id, req.user.id);
  }

  @Patch(':id')
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
  deleteGroup(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.delete(id, req.user.id);
  }
}

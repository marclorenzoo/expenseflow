import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  imageUrl: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
  }

  async updateProfile(id: string, name: string) {
    return await this.prisma.user.update({
      where: { id },
      data: { name },
      select: USER_SELECT,
    });
  }

  async updateImage(id: string, imageUrl: string) {
    return await this.prisma.user.update({
      where: { id },
      data: { imageUrl },
      select: USER_SELECT,
    });
  }

  async deleteImage(id: string) {
    return await this.prisma.user.update({
      where: { id },
      data: { imageUrl: null },
      select: USER_SELECT,
    });
  }
}

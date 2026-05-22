import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, name: string, description?: string) {
    return await this.prisma.group.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId,
            role: 'admin',
          },
        },
      },
    });
  }

  async findAllByUser(userId: string) {
    return await this.prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async findOne(id: string) {
    return await this.prisma.group.findUnique({
      where: { id: id },
      select: {
        id: true,
        name: true,
        description: true,
        members: {
          select: {
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, name: string, description?: string) {
    return await this.prisma.group.update({
      where: { id: id },
      data: { name: name, description: description },
      select: {
        id: true,
        name: true,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.groupMember.deleteMany({
      where: { groupId: id },
    });
    return await this.prisma.group.delete({
      where: { id: id },
    });
  }
}

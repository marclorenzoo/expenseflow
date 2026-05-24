import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  private async checkIsAdmin(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: userId,
          groupId: groupId,
        },
      },
    });

    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }

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
        description: true,
        imageUrl: true,
      },
    });
  }

  async findOne(id: string, requestingUserId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: requestingUserId,
          groupId: id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }
    return await this.prisma.group.findUnique({
      where: { id: id },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
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

  async updateImage(id: string, requestingUserId: string, imageUrl: string) {
    await this.checkIsAdmin(id, requestingUserId);
    return await this.prisma.group.update({
      where: { id },
      data: { imageUrl },
      select: { id: true, imageUrl: true },
    });
  }

  async deleteImage(id: string, requestingUserId: string) {
    await this.checkIsAdmin(id, requestingUserId);
    return await this.prisma.group.update({
      where: { id },
      data: { imageUrl: null },
      select: { id: true, imageUrl: true },
    });
  }

  async update(id: string, name: string, description?: string) {
    return await this.prisma.group.update({
      where: { id: id },
      data: { name: name, description: description },
      select: {
        id: true,
        name: true,
        description: true,
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

  async addMember(groupId: string, email: string, requestingUserId: string) {
    await this.checkIsAdmin(groupId, requestingUserId);

    const userToInvite = await this.prisma.user.findUnique({
      where: { email: email },
    });

    if (!userToInvite) {
      throw new NotFoundException('User not found');
    }

    return await this.prisma.groupMember.create({
      data: {
        userId: userToInvite.id,
        groupId: groupId,
        role: 'member',
      },
    });
  }

  async removeMember(
    groupId: string,
    userId: string,
    requestingUserId: string,
  ) {
    await this.checkIsAdmin(groupId, requestingUserId);

    const userToDelete = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToDelete) {
      throw new NotFoundException('User not found');
    }

    return await this.prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId: userId,
          groupId: groupId,
        },
      },
    });
  }

  async getBalances(groupId: string) {
    const expenses = await this.prisma.expense.findMany({
      where: { groupId },
      include: {
        splits: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        paidBy: { select: { id: true, name: true } },
      },
    });

    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
    });

    const paid: Record<string, number> = {};
    const owes: Record<string, number> = {};

    members.forEach((m) => {
      paid[m.userId] = 0;
      owes[m.userId] = 0;
    });

    expenses.forEach((e) => {
      paid[e.paidById] = (paid[e.paidById] || 0) + e.amount;
      e.splits.forEach((s) => {
        owes[s.userId] = (owes[s.userId] || 0) + s.amount;
      });
    });

    const balances = members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      paid: paid[m.userId] || 0,
      owes: owes[m.userId] || 0,
      balance: (paid[m.userId] || 0) - (owes[m.userId] || 0),
    }));

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    return { total, balances };
  }
}

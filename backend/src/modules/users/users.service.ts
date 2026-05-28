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

  async getStats(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const [totalResult, monthlyResult, memberships, recentExpenses] =
      await Promise.all([
        this.prisma.expense.aggregate({
          where: { paidById: userId },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            paidById: userId,
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        }),
        this.prisma.groupMember.findMany({
          where: { userId },
          include: { group: true },
        }),
        this.prisma.expense.findMany({
          where: {
            OR: [{ paidById: userId }, { splits: { some: { userId } } }],
          },
          orderBy: { date: 'desc' },
          take: 5,
          select: {
            id: true,
            description: true,
            amount: true,
            currency: true,
            date: true,
            group: { select: { name: true } },
          },
        }),
      ]);

    const groupBalances = await Promise.all(
      memberships.map(async ({ groupId, group }) => {
        const [paidResult, owedResult] = await Promise.all([
          this.prisma.expense.aggregate({
            where: { groupId, paidById: userId },
            _sum: { amount: true },
          }),
          this.prisma.expenseSplit.aggregate({
            where: { userId, expense: { groupId } },
            _sum: { amount: true },
          }),
        ]);

        const paid = paidResult._sum.amount ?? 0;
        const owed = owedResult._sum.amount ?? 0;

        return {
          groupId,
          groupName: group.name,
          balance: Math.round((paid - owed) * 100) / 100,
        };
      }),
    );

    return {
      totalExpenses: totalResult._sum.amount ?? 0,
      monthlySpending: monthlyResult._sum.amount ?? 0,
      groupBalances,
      recentActivity: recentExpenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        date: e.date,
        groupName: e.group.name,
      })),
    };
  }
}

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
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const [
      totalResult,
      monthlyResult,
      memberships,
      recentExpenses,
      categoryGroups,
      yearExpenses,
    ] = await Promise.all([
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
      this.prisma.expense.groupBy({
        by: ['category'],
        where: { paidById: userId },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.prisma.expense.findMany({
        where: {
          paidById: userId,
          date: { gte: startOfYear, lte: endOfYear },
        },
        select: { date: true, amount: true },
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

    const monthlyTotals = new Array(12).fill(0);
    for (const { date, amount } of yearExpenses) {
      monthlyTotals[new Date(date).getMonth()] += amount;
    }
    const monthlyTrend = monthlyTotals.map((total, i) => ({
      month: i + 1,
      total: Math.round(total * 100) / 100,
    }));

    const totalExpenses = totalResult._sum.amount ?? 0;

    const categoryBreakdown = categoryGroups.map(({ category, _sum }) => {
      const total = Math.round((_sum.amount ?? 0) * 100) / 100;
      const percentage =
        totalExpenses > 0
          ? Math.round((total / totalExpenses) * 10000) / 100
          : 0;
      return { category, total, percentage };
    });

    let youAreOwed = 0;
    let youOwe = 0;
    for (const { balance } of groupBalances) {
      if (balance > 0) youAreOwed += balance;
      else youOwe += -balance;
    }
    youAreOwed = Math.round(youAreOwed * 100) / 100;
    youOwe = Math.round(youOwe * 100) / 100;

    return {
      totalExpenses,
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
      categoryBreakdown,
      youAreOwed,
      youOwe,
      activeGroups: memberships.length,
      monthlyTrend,
    };
  }
}

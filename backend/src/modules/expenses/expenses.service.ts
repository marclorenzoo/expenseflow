import { Injectable } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(
    groupId: string,
    data: {
      description: string;
      amount: number;
      currency?: string;
      category?: Category;
      date?: Date;
      paidById: string;
      participantIds: string[];
    },
  ) {
    const { participantIds, ...expenseData } = data;

    return await this.prisma.expense.create({
      data: {
        ...expenseData,
        groupId,
        splits: {
          create: participantIds.map((userId) => ({
            userId,
            amount: expenseData.amount / participantIds.length,
          })),
        },
      },
    });
  }

  async findAllByGroup(groupId: string) {
    return await this.prisma.expense.findMany({
      where: { groupId: groupId },
      select: {
        id: true,
        description: true,
        amount: true,
        currency: true,
        category: true,
        date: true,
        paidBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return await this.prisma.expense.findUnique({
      where: { id: id },
      select: {
        id: true,
        description: true,
        amount: true,
        currency: true,
        category: true,
        date: true,
        paidBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        splits: {
          select: { userId: true },
        },
      },
    });
  }

  async update(
    id: string,
    data: {
      description?: string;
      amount?: number;
      currency?: string;
      category?: Category;
      date?: Date;
      participantIds?: string[];
    },
  ) {
    const { participantIds, ...expenseData } = data;

    const updated = await this.prisma.expense.update({
      where: { id },
      data: expenseData,
      select: {
        id: true,
        description: true,
        amount: true,
      },
    });

    if (participantIds && participantIds.length > 0) {
      await this.prisma.expenseSplit.deleteMany({ where: { expenseId: id } });
      await this.prisma.expenseSplit.createMany({
        data: participantIds.map((userId) => ({
          expenseId: id,
          userId,
          amount: updated.amount / participantIds.length,
        })),
      });
    }

    return updated;
  }

  async delete(id: string) {
    await this.prisma.expenseSplit.deleteMany({
      where: { expenseId: id },
    });
    return await this.prisma.expense.delete({
      where: { id: id },
    });
  }
}

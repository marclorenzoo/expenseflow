import { Injectable, Logger } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private notifications: NotificationsService,
  ) {}

  /**
   * Emite un evento de negocio al room del grupo. Best-effort: si el realtime
   * falla, se loguea pero NO se propaga, porque la operación de BD ya terminó.
   */
  private emit(groupId: string, event: string, payload: any): void {
    try {
      this.realtime.emitToGroup(groupId, event, payload);
    } catch (err) {
      this.logger.error(
        `No se pudo emitir "${event}" al grupo ${groupId}`,
        err as Error,
      );
    }
  }

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
    createdByUserId: string,
  ) {
    const { participantIds, ...expenseData } = data;

    const expense = await this.prisma.expense.create({
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

    this.emit(groupId, 'expense.created', expense);

    await this.notifyExpenseCreated(groupId, expense, createdByUserId);

    return expense;
  }

  /**
   * Crea una notificación EXPENSE_CREATED para cada miembro del grupo EXCEPTO
   * el autor. Best-effort: un fallo aquí NUNCA debe romper la creación del
   * gasto, así que va envuelto en try/catch silencioso.
   */
  private async notifyExpenseCreated(
    groupId: string,
    expense: {
      id: string;
      description: string;
      amount: number;
      currency: string;
    },
    createdByUserId: string,
  ): Promise<void> {
    try {
      const [members, group, actor] = await Promise.all([
        this.prisma.groupMember.findMany({
          where: { groupId, NOT: { userId: createdByUserId } },
        }),
        this.prisma.group.findUnique({ where: { id: groupId } }),
        this.prisma.user.findUnique({ where: { id: createdByUserId } }),
      ]);

      if (!group || !actor) return;

      await Promise.all(
        members.map((m) =>
          this.notifications.create({
            userId: m.userId,
            type: 'EXPENSE_CREATED',
            title: `Nuevo gasto en ${group.name}`,
            message: `${actor.name} añadió '${expense.description}' (${expense.amount} ${expense.currency}) en ${group.name}`,
            data: {
              groupId,
              expenseId: expense.id,
              actorUserId: createdByUserId,
            },
          }),
        ),
      );
    } catch (err) {
      this.logger.warn(
        `No se pudieron crear notificaciones de gasto en el grupo ${groupId}: ${
          (err as Error).message
        }`,
      );
    }
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

    // El groupId no cambia en un update, así que basta con consultarlo aquí
    // para enrutar el evento al room correcto.
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      select: { groupId: true },
    });
    if (expense) {
      this.emit(expense.groupId, 'expense.updated', updated);
    }

    return updated;
  }

  async delete(id: string) {
    // Capturamos el groupId ANTES de borrar: después el gasto ya no existe.
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      select: { groupId: true },
    });

    await this.prisma.expenseSplit.deleteMany({
      where: { expenseId: id },
    });
    const deleted = await this.prisma.expense.delete({
      where: { id: id },
    });

    if (expense) {
      this.emit(expense.groupId, 'expense.deleted', {
        expenseId: id,
        groupId: expense.groupId,
      });
    }

    return deleted;
  }
}

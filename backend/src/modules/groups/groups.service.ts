import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { computeSettlements } from './settlements.utils';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private notifications: NotificationsService,
    private activity: ActivityService,
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
                imageUrl: true,
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

  async update(
    id: string,
    requestingUserId: string,
    name: string,
    description?: string,
  ) {
    await this.checkIsAdmin(id, requestingUserId);
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

  async delete(id: string, deletedByUserId: string) {
    await this.checkIsAdmin(id, deletedByUserId);

    // Recogemos miembros (menos quien borra), nombre del grupo y actor ANTES
    // de eliminar: después el grupo y sus miembros ya no existen en BD.
    const [members, group, actor] = await Promise.all([
      this.prisma.groupMember.findMany({
        where: { groupId: id, NOT: { userId: deletedByUserId } },
      }),
      this.prisma.group.findUnique({ where: { id } }),
      this.prisma.user.findUnique({ where: { id: deletedByUserId } }),
    ]);
    const groupName = group?.name;

    await this.prisma.expenseSplit.deleteMany({
      where: { expense: { groupId: id } },
    });
    await this.prisma.expense.deleteMany({
      where: { groupId: id },
    });
    await this.prisma.groupMember.deleteMany({
      where: { groupId: id },
    });
    const deleted = await this.prisma.group.delete({
      where: { id: id },
    });

    // Best-effort: un fallo en notificaciones NO debe romper el borrado.
    if (groupName && actor) {
      try {
        await Promise.all(
          members.map((m) =>
            this.notifications.create({
              userId: m.userId,
              type: 'GROUP_DELETED',
              title: 'Grupo eliminado',
              message: `${actor.name} ha eliminado el grupo ${groupName}`,
              data: { actorUserId: deletedByUserId, groupName },
            }),
          ),
        );
      } catch (err) {
        this.logger.warn(
          `No se pudieron crear notificaciones de borrado del grupo ${id}: ${
            (err as Error).message
          }`,
        );
      }
    }

    return deleted;
  }

  async addMember(groupId: string, email: string, requestingUserId: string) {
    await this.checkIsAdmin(groupId, requestingUserId);

    const userToInvite = await this.prisma.user.findUnique({
      where: { email: email },
    });

    if (!userToInvite) {
      throw new NotFoundException('User not found');
    }

    const member = await this.prisma.groupMember.create({
      data: {
        userId: userToInvite.id,
        groupId: groupId,
        role: 'member',
      },
    });

    this.emit(groupId, 'member.added', member);

    await this.activity.log({
      groupId,
      actorUserId: requestingUserId,
      type: 'MEMBER_ADDED',
      data: { memberName: userToInvite.name, memberUserId: userToInvite.id },
    });

    // Notifica SOLO al miembro recién añadido. Best-effort: un fallo aquí no
    // debe romper la operación de añadir miembro.
    try {
      const [group, actor] = await Promise.all([
        this.prisma.group.findUnique({ where: { id: groupId } }),
        this.prisma.user.findUnique({ where: { id: requestingUserId } }),
      ]);

      if (group && actor) {
        await this.notifications.create({
          userId: member.userId,
          type: 'MEMBER_ADDED',
          title: `Te añadieron a ${group.name}`,
          message: `${actor.name} te ha añadido al grupo ${group.name}`,
          data: { groupId, actorUserId: requestingUserId },
        });
      }
    } catch (err) {
      this.logger.warn(
        `No se pudo crear la notificación de alta de miembro en el grupo ${groupId}: ${
          (err as Error).message
        }`,
      );
    }

    return member;
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

    const removed = await this.prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId: userId,
          groupId: groupId,
        },
      },
    });

    this.emit(groupId, 'member.removed', { groupId, userId });

    await this.activity.log({
      groupId,
      actorUserId: requestingUserId,
      type: 'MEMBER_REMOVED',
      data: { memberName: userToDelete.name, memberUserId: userToDelete.id },
    });

    return removed;
  }

  async getBalances(groupId: string, requestingUserId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: requestingUserId, groupId } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this group');
    }

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

    const settlements = computeSettlements(expenses);

    return { total, balances, settlements };
  }
}

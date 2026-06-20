import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export interface CreateNotificationData {
  userId: string;
  type: 'EXPENSE_CREATED' | 'MEMBER_ADDED' | 'GROUP_DELETED';
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
}

/** Tope de notificaciones devueltas en el listado (paginación simple). */
const MAX_NOTIFICATIONS = 50;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  async create(data: CreateNotificationData) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
      },
    });

    // Entrega en tiempo real al destinatario. Best-effort: si el realtime
    // falla, la notificación ya está persistida y se verá al recargar.
    try {
      this.realtime.emitToUser(
        data.userId,
        'notification.created',
        notification,
      );
    } catch (err) {
      this.logger.warn(
        `No se pudo emitir 'notification.created' al usuario ${data.userId}: ${
          (err as Error).message
        }`,
      );
    }

    return notification;
  }

  async findAllForUser(userId: string, options?: { unreadOnly?: boolean }) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(options?.unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_NOTIFICATIONS,
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta notificación');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { count };
  }

  async deleteAll(userId: string) {
    const { count } = await this.prisma.notification.deleteMany({
      where: { userId },
    });
    return { count };
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }
}

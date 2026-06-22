import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export type ActivityType =
  | 'EXPENSE_CREATED'
  | 'EXPENSE_UPDATED'
  | 'EXPENSE_DELETED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED';

export interface LogActivityData {
  groupId: string;
  actorUserId: string;
  type: ActivityType;
  data: Prisma.InputJsonValue;
}

/** Tope de entradas devueltas en el feed de actividad. */
const MAX_ACTIVITY = 50;

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Registra una entrada en el historial de actividad. Best-effort: una caída
   * del activity log NUNCA debe romper la operación principal (mismo patrón
   * que las notificaciones), así que va envuelto en try/catch silencioso.
   */
  async log(data: LogActivityData): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: data.actorUserId,
          type: data.type,
          data: data.data,
        },
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo registrar la actividad '${data.type}' en el grupo ${
          data.groupId
        }: ${(err as Error).message}`,
      );
    }
  }

  async findAllByGroup(groupId: string, requestingUserId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: { userId: requestingUserId, groupId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No eres miembro de este grupo');
    }

    return this.prisma.activityLog.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: MAX_ACTIVITY,
      include: {
        actor: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
    });
  }
}

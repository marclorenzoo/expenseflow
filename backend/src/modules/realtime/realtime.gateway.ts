import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';

const FRONTEND_ORIGIN = process.env.FRONTEND_URL ?? 'http://localhost:4200';

/**
 * Gateway de tiempo real. Solo infraestructura: autentica el socket vía JWT,
 * mete a cada cliente en su room de usuario y gestiona rooms de grupo bajo
 * demanda. No emite todavía ningún evento de negocio: expone emitToUser /
 * emitToGroup para que otros servicios los usen en una tarea posterior.
 */
@WebSocketGateway({
  cors: {
    origin: FRONTEND_ORIGIN,
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(
        `Socket ${client.id} rechazado: no se ha enviado token en el handshake`,
      );
      client.disconnect(true);
      return;
    }

    let payload: { sub: string; email: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      this.logger.warn(
        `Socket ${client.id} rechazado: token JWT inválido o expirado`,
      );
      client.disconnect(true);
      return;
    }

    const userId = payload.sub;
    client.data.userId = userId;
    await client.join(this.userRoom(userId));

    this.logger.log(`Cliente conectado: socket=${client.id} user=${userId}`);
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data.userId as string | undefined;
    this.logger.log(
      `Cliente desconectado: socket=${client.id} user=${userId ?? 'desconocido'}`,
    );
  }

  // ── Rooms de grupo (bajo demanda del cliente) ───────────────────────────

  @SubscribeMessage('group:join')
  async joinGroupRoom(client: Socket, groupId: string): Promise<void> {
    const userId = client.data.userId as string | undefined;
    if (!userId || !groupId) {
      return;
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    });

    if (!membership) {
      this.logger.warn(
        `Socket ${client.id} (user=${userId}) intentó unirse al grupo ${groupId} sin pertenecer a él`,
      );
      return;
    }

    await client.join(this.groupRoom(groupId));
    this.logger.log(
      `Socket ${client.id} (user=${userId}) se unió al grupo ${groupId}`,
    );
  }

  @SubscribeMessage('group:leave')
  async leaveGroupRoom(client: Socket, groupId: string): Promise<void> {
    if (!groupId) {
      return;
    }
    await client.leave(this.groupRoom(groupId));
    this.logger.log(
      `Socket ${client.id} (user=${client.data.userId}) salió del grupo ${groupId}`,
    );
  }

  // ── Emisores públicos para otros servicios ──────────────────────────────

  emitToUser(userId: string, event: string, payload: any): void {
    this.server.to(this.userRoom(userId)).emit(event, payload);
  }

  emitToGroup(groupId: string, event: string, payload: any): void {
    this.server.to(this.groupRoom(groupId)).emit(event, payload);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token as string | undefined;
    const queryToken = client.handshake.query?.token as string | undefined;
    return authToken ?? queryToken;
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private groupRoom(groupId: string): string {
    return `group:${groupId}`;
  }
}

import {
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las notificaciones del usuario' })
  @ApiQuery({
    name: 'unreadOnly',
    required: false,
    description: 'Si es "true", devuelve solo las no leídas',
    example: 'true',
  })
  @ApiResponse({ status: 200, description: 'Lista de notificaciones.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  findAll(@Req() req: any, @Query('unreadOnly') unreadOnly?: string) {
    return this.notificationsService.findAllForUser(req.user.id, {
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Devuelve el número de notificaciones no leídas' })
  @ApiResponse({
    status: 200,
    description: 'Contador de no leídas: { count }.',
  })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  async unreadCount(@Req() req: any) {
    const count = await this.notificationsService.countUnread(req.user.id);
    return { count };
  }

  // Nota: 'read-all' va ANTES de ':id/read' para que Nest no interprete
  // "read-all" como un :id.
  @Patch('read-all')
  @ApiOperation({ summary: 'Marca todas las notificaciones como leídas' })
  @ApiResponse({
    status: 200,
    description: 'Todas las notificaciones marcadas como leídas.',
  })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marca una notificación como leída' })
  @ApiParam({ name: 'id', description: 'ID de la notificación' })
  @ApiResponse({ status: 200, description: 'Notificación marcada como leída.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 404, description: 'Notificación no encontrada.' })
  markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Delete()
  @ApiOperation({ summary: 'Elimina todas las notificaciones del usuario' })
  @ApiResponse({ status: 200, description: 'Notificaciones eliminadas.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  deleteAll(@Req() req: any) {
    return this.notificationsService.deleteAll(req.user.id);
  }
}

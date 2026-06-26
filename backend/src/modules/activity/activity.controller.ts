import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ActivityService } from './activity.service';

@ApiTags('activity')
@ApiBearerAuth()
@Controller('groups')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get(':groupId/activity')
  @ApiOperation({ summary: 'Lista el registro de actividad de un grupo' })
  @ApiParam({ name: 'groupId', description: 'ID del grupo' })
  @ApiResponse({
    status: 200,
    description: 'Lista de eventos de actividad del grupo.',
  })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({
    status: 403,
    description: 'El usuario no pertenece al grupo.',
  })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado.' })
  findAll(@Req() req: any, @Param('groupId') groupId: string) {
    return this.activityService.findAllByGroup(groupId, req.user.id);
  }
}

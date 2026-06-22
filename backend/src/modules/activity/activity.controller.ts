import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ActivityService } from './activity.service';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get(':groupId/activity')
  findAll(@Req() req: any, @Param('groupId') groupId: string) {
    return this.activityService.findAllByGroup(groupId, req.user.id);
  }
}

import {
  Controller,
  UseGuards,
  Req,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Post()
  createGroup(
    @Req() req: any,
    @Body() body: { name: string; description?: string },
  ) {
    return this.groupsService.create(req.user.id, body.name, body.description);
  }

  @Get()
  getGroups(@Req() req: any) {
    return this.groupsService.findAllByUser(req.user.id);
  }

  @Get(':id')
  getGroupById(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  updateGroup(
    @Param('id') id: string,
    @Body() body: { name: string; description?: string },
  ) {
    return this.groupsService.update(id, body.name, body.description);
  }

  @Delete(':id')
  deleteGroup(@Param('id') id: string) {
    return this.groupsService.delete(id);
  }
}

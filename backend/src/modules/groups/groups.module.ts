import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/common/guards/jwt.strategy';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [JwtModule.register({}), RealtimeModule, NotificationsModule],
  controllers: [GroupsController],
  providers: [GroupsService, JwtStrategy],
})
export class GroupsModule {}

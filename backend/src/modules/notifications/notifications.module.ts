import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/common/guards/jwt.strategy';
import { PrismaModule } from '../../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [JwtModule.register({}), PrismaModule, RealtimeModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, JwtStrategy],
  exports: [NotificationsService],
})
export class NotificationsModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/common/guards/jwt.strategy';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

@Module({
  imports: [JwtModule.register({}), PrismaModule],
  controllers: [ActivityController],
  providers: [ActivityService, JwtStrategy],
  exports: [ActivityService],
})
export class ActivityModule {}

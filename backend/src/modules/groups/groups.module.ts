import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/common/guards/jwt.strategy';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [GroupsController],
  providers: [GroupsService, JwtStrategy],
})
export class GroupsModule {}

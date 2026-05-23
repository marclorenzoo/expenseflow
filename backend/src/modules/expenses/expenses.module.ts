import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/common/guards/jwt.strategy';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ExpensesController],
  providers: [ExpensesService, JwtStrategy],
})
export class ExpensesModule {}

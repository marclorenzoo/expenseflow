import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/common/guards/jwt.strategy';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { ReceiptOcrService } from './receipt-ocr.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [JwtModule.register({}), RealtimeModule, NotificationsModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, ReceiptOcrService, JwtStrategy],
})
export class ExpensesModule {}

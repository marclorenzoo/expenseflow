import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param,
} from '@nestjs/common';
import { Category } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post('/groups/:groupId/expenses')
  addExpense(
    @Param('groupId') groupId: string,
    @Body()
    body: {
      description: string;
      amount: number;
      currency?: string;
      category?: Category;
      date?: Date;
      paidById: string;
      participantIds: string[];
    },
  ) {
    return this.expensesService.create(groupId, body);
  }

  // TODO: GET /groups/:groupId/expenses
  @Get('/groups/:groupId/expenses')
  getExpenses(@Param('groupId') groupId: string) {
    return this.expensesService.findAllByGroup(groupId);
  }

  // TODO: GET /expenses/:id
  @Get('/expenses/:id')
  getExpenseById(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }
  // TODO: PATCH /expenses/:id
  @Patch('/expenses/:id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      description?: string;
      amount?: number;
      currency?: string;
      category?: Category;
      date?: Date;
      participantIds?: string[];
    },
  ) {
    return this.expensesService.update(id, body);
  }

  // TODO: DELETE /expenses/:id
  @Delete('/expenses/:id')
  delete(@Param('id') id: string) {
    return this.expensesService.delete(id);
  }
}

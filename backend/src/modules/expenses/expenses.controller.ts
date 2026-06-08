import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { Category } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MAX_RECEIPT_SIZE, receiptFileFilter } from './receipt-upload.config';

@Controller()
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  /**
   * Sube el ticket/recibo de un gasto (un único archivo en form-data, campo
   * "receipt"). Valida tipo (mimetype + extensión) y tamaño (5 MB), lo guarda
   * en uploads/receipts con un nombre único y devuelve su URL pública.
   *
   * Por ahora solo recibe, valida y guarda el archivo: el OCR y la creación
   * del gasto se implementan más adelante.
   */
  @Post('/expenses/upload-receipt')
  @UseInterceptors(
    FileInterceptor('receipt', {
      storage: memoryStorage(),
      fileFilter: receiptFileFilter,
    }),
  )
  uploadReceipt(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_RECEIPT_SIZE,
            message: 'El archivo supera el tamaño máximo permitido de 5 MB.',
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const uploadDir = join(process.cwd(), 'uploads', 'receipts');
    mkdirSync(uploadDir, { recursive: true });

    const ext = extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}${ext}`;
    writeFileSync(join(uploadDir, filename), file.buffer);

    const url = `/uploads/receipts/${filename}`;
    return {
      url,
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

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

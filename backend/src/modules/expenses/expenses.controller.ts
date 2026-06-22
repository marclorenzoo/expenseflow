import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { Category } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { ReceiptOcrService } from './receipt-ocr.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MAX_RECEIPT_SIZE, receiptFileFilter } from './receipt-upload.config';

@Controller()
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(
    private expensesService: ExpensesService,
    private receiptOcrService: ReceiptOcrService,
  ) {}

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

  /**
   * Parsea un ticket/recibo con Groq Vision y devuelve los datos extraídos
   * (total, fecha, comercio e items). NO crea el gasto: solo lee la imagen.
   *
   * Mismo patrón de subida que upload-receipt (Multer + memoryStorage +
   * receiptFileFilter + límite de 5 MB), pero aquí solo se aceptan imágenes
   * JPG/PNG: Groq Vision no procesa PDFs, así que el PDF se rechaza con 400.
   */
  @Post('/expenses/parse-receipt')
  @UseInterceptors(
    FileInterceptor('receipt', {
      storage: memoryStorage(),
      fileFilter: receiptFileFilter,
    }),
  )
  parseReceipt(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_RECEIPT_SIZE,
            message: 'El archivo supera el tamaño máximo permitido de 5 MB.',
          }),
          // Groq Vision no procesa PDFs: aquí solo JPG/PNG.
          new FileTypeValidator({ fileType: /^image\/(jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.receiptOcrService.parseReceipt(file.buffer, file.mimetype);
  }

  @Post('/groups/:groupId/expenses')
  addExpense(
    @Req() req: any,
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
    return this.expensesService.create(groupId, body, req.user.id);
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
    @Req() req: any,
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
    return this.expensesService.update(id, body, req.user.id);
  }

  // TODO: DELETE /expenses/:id
  @Delete('/expenses/:id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.expensesService.delete(id, req.user.id);
  }
}

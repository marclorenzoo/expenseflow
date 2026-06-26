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
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { Category } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { ReceiptOcrService } from './receipt-ocr.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MAX_RECEIPT_SIZE, receiptFileFilter } from './receipt-upload.config';

@ApiTags('expenses')
@ApiBearerAuth()
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
  @ApiOperation({
    summary: 'Sube y guarda el recibo de un gasto (imagen o PDF, máx 5 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        receipt: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Recibo guardado; devuelve su URL pública y metadatos.',
  })
  @ApiResponse({
    status: 400,
    description: 'Archivo ausente, tipo no permitido o supera 5 MB.',
  })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
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
  // CRÍTICO: cada llamada gasta créditos de Groq Vision. 10 peticiones/hora
  // por IP para contener abuso y coste.
  @Throttle({ default: { ttl: 3600000, limit: 10 } })
  @Post('/expenses/parse-receipt')
  @ApiOperation({
    summary:
      'Extrae datos de un ticket con OCR/Visión (solo JPG/PNG, máx 5 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        receipt: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Datos extraídos del ticket (total, fecha, comercio e items).',
  })
  @ApiResponse({
    status: 400,
    description: 'Archivo ausente, no es JPG/PNG o supera 5 MB.',
  })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({
    status: 429,
    description: 'Límite de peticiones de OCR superado.',
  })
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
  @ApiOperation({ summary: 'Crea un gasto dentro de un grupo' })
  @ApiParam({ name: 'groupId', description: 'ID del grupo' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['description', 'amount', 'paidById', 'participantIds'],
      properties: {
        description: { type: 'string', example: 'Cena en Barcelona' },
        amount: { type: 'number', example: 42.5 },
        currency: { type: 'string', example: 'EUR' },
        category: {
          type: 'string',
          enum: Object.values(Category),
          example: 'food',
        },
        date: {
          type: 'string',
          format: 'date-time',
          example: '2026-06-20T21:00:00.000Z',
        },
        paidById: { type: 'string', example: 'clt0u9abc0001xyz' },
        participantIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['clt0u9abc0001xyz', 'clt0u9def0002xyz'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Gasto creado.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({
    status: 403,
    description: 'El usuario no pertenece al grupo.',
  })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado.' })
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

  @Get('/groups/:groupId/expenses')
  @ApiOperation({ summary: 'Lista los gastos de un grupo' })
  @ApiParam({ name: 'groupId', description: 'ID del grupo' })
  @ApiResponse({ status: 200, description: 'Lista de gastos del grupo.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({
    status: 403,
    description: 'El usuario no pertenece al grupo.',
  })
  @ApiResponse({ status: 404, description: 'Grupo no encontrado.' })
  getExpenses(@Req() req: any, @Param('groupId') groupId: string) {
    return this.expensesService.findAllByGroup(groupId, req.user.id);
  }

  @Get('/expenses/:id')
  @ApiOperation({ summary: 'Devuelve el detalle de un gasto' })
  @ApiParam({ name: 'id', description: 'ID del gasto' })
  @ApiResponse({ status: 200, description: 'Detalle del gasto.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Sin acceso al gasto.' })
  @ApiResponse({ status: 404, description: 'Gasto no encontrado.' })
  getExpenseById(@Req() req: any, @Param('id') id: string) {
    return this.expensesService.findOne(id, req.user.id);
  }

  @Patch('/expenses/:id')
  @ApiOperation({ summary: 'Actualiza un gasto' })
  @ApiParam({ name: 'id', description: 'ID del gasto' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        description: { type: 'string', example: 'Cena en Barcelona' },
        amount: { type: 'number', example: 42.5 },
        currency: { type: 'string', example: 'EUR' },
        category: {
          type: 'string',
          enum: Object.values(Category),
          example: 'food',
        },
        date: {
          type: 'string',
          format: 'date-time',
          example: '2026-06-20T21:00:00.000Z',
        },
        participantIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['clt0u9abc0001xyz', 'clt0u9def0002xyz'],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Gasto actualizado.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos sobre el gasto.' })
  @ApiResponse({ status: 404, description: 'Gasto no encontrado.' })
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

  @Delete('/expenses/:id')
  @ApiOperation({ summary: 'Elimina un gasto' })
  @ApiParam({ name: 'id', description: 'ID del gasto' })
  @ApiResponse({ status: 200, description: 'Gasto eliminado.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Sin permisos sobre el gasto.' })
  @ApiResponse({ status: 404, description: 'Gasto no encontrado.' })
  delete(@Req() req: any, @Param('id') id: string) {
    return this.expensesService.delete(id, req.user.id);
  }
}

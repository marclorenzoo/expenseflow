import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import type { Request } from 'express';

/**
 * Configuración y validaciones para la subida del ticket/recibo de un gasto.
 * Mismo patrón que la subida de imágenes de perfil/grupo (Multer + memoryStorage
 * + fileFilter), pero aceptando además PDF y conservando el archivo tal cual.
 */

/** Tamaño máximo permitido para un recibo: 5 MB. */
export const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;

/** Mimetypes permitidos. */
export const ALLOWED_RECEIPT_MIME_TYPES = [
  'image/jpeg', // .jpg y .jpeg
  'image/png',
  'application/pdf',
];

/** Extensiones permitidas (en minúsculas, con punto). */
export const ALLOWED_RECEIPT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

/**
 * fileFilter de Multer: valida el mimetype Y la extensión del archivo.
 * Rechaza cualquier otro tipo con un mensaje claro.
 */
export function receiptFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  const ext = extname(file.originalname).toLowerCase();
  const mimeTypeOk = ALLOWED_RECEIPT_MIME_TYPES.includes(file.mimetype);
  const extensionOk = ALLOWED_RECEIPT_EXTENSIONS.includes(ext);

  if (mimeTypeOk && extensionOk) {
    cb(null, true);
    return;
  }

  cb(
    new BadRequestException(
      'Formato de archivo no válido. Solo se permiten archivos JPG, JPEG, PNG o PDF.',
    ),
    false,
  );
}

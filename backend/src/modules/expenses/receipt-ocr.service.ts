import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ParsedReceipt, ReceiptItem } from './dto/parse-receipt.dto';

/** Endpoint de Groq compatible con la API de OpenAI. */
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Modelo de visión actual de Groq (Llama 4 Scout). */
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

/** Mensaje genérico que ve el cliente cuando algo falla en Groq o el parsing. */
const PARSE_ERROR_MESSAGE = 'No se pudo procesar el ticket, inténtalo de nuevo';

/** Forma mínima de la respuesta de chat/completions de Groq que nos interesa. */
interface GroqChatResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

const PROMPT = [
  'Eres un asistente que extrae datos de tickets de compra.',
  'Analiza la imagen del ticket y extrae estos campos:',
  '- total: el importe total final pagado (number)',
  '- date: la fecha del ticket en formato ISO YYYY-MM-DD (string)',
  '- merchant: el nombre del comercio/establecimiento (string)',
  '- items: array de objetos { name: string, price: number } con los productos',
  '',
  'Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin ``` ni',
  '```json, sin texto antes ni después. Solo el objeto JSON.',
  'Si algún campo no se puede determinar, devuélvelo como null',
  '(para items usa un array vacío []).',
  'Formato exacto:',
  '{"total": number|null, "date": "YYYY-MM-DD"|null, "merchant": string|null, "items": [{"name": string, "price": number}]}',
].join('\n');

/**
 * Encapsula la llamada a Groq Vision para parsear tickets desde imágenes.
 * El controller solo recibe el archivo y delega aquí; este servicio se encarga
 * de construir la petición, llamar a Groq, parsear el JSON y sanear el resultado.
 */
@Injectable()
export class ReceiptOcrService {
  private readonly logger = new Logger(ReceiptOcrService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Parsea un ticket a partir del buffer de una imagen (JPG/PNG).
   * @param buffer   Contenido binario de la imagen.
   * @param mimeType Mimetype de la imagen (image/jpeg | image/png).
   */
  async parseReceipt(buffer: Buffer, mimeType: string): Promise<ParsedReceipt> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      // Configuración del servidor incompleta: no es un error del cliente.
      this.logger.error('Falta GROQ_API_KEY en la configuración.');
      throw new InternalServerErrorException(
        'El servicio de OCR no está configurado correctamente.',
      );
    }

    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

    let response: Response;
    try {
      response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_VISION_MODEL,
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: PROMPT },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
        }),
      });
    } catch (err) {
      // Fallo de red / DNS / timeout al contactar con Groq.
      this.logger.error(
        `Error de red al llamar a Groq: ${(err as Error).message}`,
      );
      throw new BadGatewayException(PARSE_ERROR_MESSAGE);
    }

    if (!response.ok) {
      // Rate limit, key inválida, modelo caído, etc.
      const detail = await response.text().catch(() => '');
      this.logger.error(
        `Groq respondió ${response.status}: ${detail.slice(0, 500)}`,
      );
      throw new BadGatewayException(PARSE_ERROR_MESSAGE);
    }

    const content = await this.extractContent(response);
    return this.parseModelJson(content);
  }

  /** Extrae el texto del primer choice de la respuesta de Groq. */
  private async extractContent(response: Response): Promise<string> {
    let payload: GroqChatResponse;
    try {
      payload = (await response.json()) as GroqChatResponse;
    } catch (err) {
      this.logger.error(
        `Respuesta de Groq no es JSON: ${(err as Error).message}`,
      );
      throw new BadGatewayException(PARSE_ERROR_MESSAGE);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      this.logger.error('Groq no devolvió contenido en el mensaje.');
      throw new BadGatewayException(PARSE_ERROR_MESSAGE);
    }
    return content;
  }

  /** Parsea y sanea el JSON que devuelve el modelo. */
  private parseModelJson(content: string): ParsedReceipt {
    const cleaned = this.stripCodeFences(content);

    let raw: unknown;
    try {
      raw = JSON.parse(cleaned);
    } catch {
      this.logger.error(
        `El modelo no devolvió JSON válido: ${cleaned.slice(0, 500)}`,
      );
      throw new BadGatewayException(PARSE_ERROR_MESSAGE);
    }

    if (typeof raw !== 'object' || raw === null) {
      this.logger.error('El JSON del modelo no es un objeto.');
      throw new BadGatewayException(PARSE_ERROR_MESSAGE);
    }

    const obj = raw as Record<string, unknown>;
    return {
      total: this.toNumberOrNull(obj.total),
      date: this.toIsoDateOrNull(obj.date),
      merchant: this.toStringOrNull(obj.merchant),
      items: this.toItems(obj.items),
    };
  }

  /**
   * Aunque el prompt pide JSON sin markdown, algunos modelos siguen envolviendo
   * la respuesta en ```json ... ```. Lo quitamos por robustez antes de parsear.
   */
  private stripCodeFences(content: string): string {
    const trimmed = content.trim();
    const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
    return (fenced ? fenced[1] : trimmed).trim();
  }

  private toNumberOrNull(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value.replace(',', '.'));
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  private toStringOrNull(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return null;
  }

  private toIsoDateOrNull(value: unknown): string | null {
    const str = this.toStringOrNull(value);
    if (!str) return null;
    // Aceptamos solo YYYY-MM-DD; cualquier otra cosa se descarta a null.
    return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : null;
  }

  private toItems(value: unknown): ReceiptItem[] {
    if (!Array.isArray(value)) return [];
    const items: ReceiptItem[] = [];
    for (const entry of value) {
      if (typeof entry !== 'object' || entry === null) continue;
      const obj = entry as Record<string, unknown>;
      const name = this.toStringOrNull(obj.name);
      const price = this.toNumberOrNull(obj.price);
      if (name !== null && price !== null) {
        items.push({ name, price });
      }
    }
    return items;
  }
}

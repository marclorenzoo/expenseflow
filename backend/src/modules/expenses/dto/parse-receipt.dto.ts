/**
 * Estructura de un producto/línea extraída de un ticket.
 */
export interface ReceiptItem {
  name: string;
  price: number;
}

/**
 * Resultado del parseo de un ticket por el modelo de visión.
 * Lo que recibe el frontend desde POST /expenses/parse-receipt.
 */
export interface ParsedReceipt {
  /** Importe total del ticket, o null si no se pudo determinar. */
  total: number | null;
  /** Fecha del ticket en formato ISO YYYY-MM-DD, o null. */
  date: string | null;
  /** Nombre del comercio, o null. */
  merchant: string | null;
  /** Líneas del ticket; array vacío si no se pudieron extraer. */
  items: ReceiptItem[];
}

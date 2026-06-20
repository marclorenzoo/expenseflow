import { Injectable, inject, signal } from '@angular/core';
import {
  NotificationsService,
  Notification,
} from '@core/services/notifications.service';
import { RealtimeService } from '@core/services/realtime.service';

@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private notificationsService = inject(NotificationsService);
  private realtime = inject(RealtimeService);

  private _notifications = signal<Notification[]>([]);
  private _unreadCount = signal<number>(0);
  private _isLoading = signal<boolean>(false);

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  constructor() {
    this.setupRealtime();
  }

  async loadNotifications(): Promise<void> {
    this._isLoading.set(true);
    try {
      const data = await this.notificationsService.getAll();
      this._notifications.set(data);
      this._unreadCount.set(data.filter((n) => !n.read).length);
    } catch {
      // Silencioso: si falla la carga dejamos el estado actual; el badge
      // se recalculará en la próxima carga o evento de realtime.
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadUnreadCount(): Promise<void> {
    try {
      const count = await this.notificationsService.getUnreadCount();
      this._unreadCount.set(count);
    } catch {
      // Silencioso.
    }
  }

  /**
   * Optimistic: marca la notificación como leída en local de inmediato, luego
   * confirma con la API. Si la API falla, revierte al estado anterior.
   */
  async markAsRead(id: string): Promise<void> {
    const prev = this._notifications();
    const target = prev.find((n) => n.id === id);
    if (!target || target.read) return;

    this._notifications.set(
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    this._unreadCount.update((c) => Math.max(0, c - 1));

    try {
      await this.notificationsService.markAsRead(id);
    } catch {
      this._notifications.set(prev);
      this._unreadCount.update((c) => c + 1);
    }
  }

  async markAllAsRead(): Promise<void> {
    const prev = this._notifications();
    const prevCount = this._unreadCount();
    if (prevCount === 0) return;

    this._notifications.set(prev.map((n) => ({ ...n, read: true })));
    this._unreadCount.set(0);

    try {
      await this.notificationsService.markAllAsRead();
    } catch {
      this._notifications.set(prev);
      this._unreadCount.set(prevCount);
    }
  }

  /**
   * Optimistic: vacía la lista y el contador de inmediato, luego confirma con
   * la API. Si la API falla, revierte recargando desde el servidor.
   */
  async deleteAll(): Promise<void> {
    if (this._notifications().length === 0) return;

    this._notifications.set([]);
    this._unreadCount.set(0);

    try {
      await this.notificationsService.deleteAll();
    } catch {
      await this.loadNotifications();
    }
  }

  /** Reinicia el store (al cerrar sesión). */
  reset(): void {
    this._notifications.set([]);
    this._unreadCount.set(0);
  }

  /**
   * Suscribe el store al evento 'notification.created'. Cuando llega una
   * notificación nueva (otro usuario hizo algo que nos concierne), la añadimos
   * al inicio de la lista e incrementamos el contador de no-leídas.
   *
   * Se llama una sola vez desde el constructor (singleton); los listeners se
   * persisten en RealtimeService y sobreviven a las reconexiones del socket.
   */
  private setupRealtime(): void {
    this.realtime.on<Notification>('notification.created', (notification) => {
      this._notifications.update((list) => [notification, ...list]);
      if (!notification.read) {
        this._unreadCount.update((c) => c + 1);
      }
    });
  }
}

import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { NotificationsStore } from '@core/stores/notifications.store';
import { Notification } from '@core/services/notifications.service';

@Component({
  selector: 'app-notifications-panel',
  templateUrl: './notifications-panel.html',
  styleUrl: './notifications-panel.scss',
})
export class NotificationsPanel {
  private readonly store = inject(NotificationsStore);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected readonly notifications = this.store.notifications;
  protected readonly unreadCount = this.store.unreadCount;

  protected readonly open = signal(false);

  protected readonly badgeLabel = computed(() => {
    const count = this.unreadCount();
    return count > 9 ? '9+' : `${count}`;
  });

  protected readonly ariaLabel = computed(
    () => `Notificaciones, ${this.unreadCount()} no leídas`,
  );

  protected toggle(): void {
    const willOpen = !this.open();
    this.open.set(willOpen);
    // Decisión simple: abrir el panel marca todas como leídas.
    if (willOpen && this.unreadCount() > 0) {
      this.store.markAllAsRead();
    }
  }

  protected close(): void {
    this.open.set(false);
  }

  protected markAllAsRead(): void {
    this.store.markAllAsRead();
  }

  protected clearAll(): void {
    this.store.deleteAll();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const host = this.elementRef.nativeElement as HTMLElement;
    if (!host.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }

  protected onNotificationClick(n: Notification): void {
    // GROUP_DELETED no navega: el grupo ya no existe.
    if (n.type === 'GROUP_DELETED') return;

    const groupId = n.data?.groupId;
    if (groupId) {
      this.open.set(false);
      this.router.navigate(['/groups', groupId]);
    }
  }

  /** Tiempo relativo simple en español, sin librerías externas. */
  protected relativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return 'hace un momento';

    const min = Math.floor(sec / 60);
    if (min < 60) return `hace ${min} min`;

    const hours = Math.floor(min / 60);
    if (hours < 24) return `hace ${hours} h`;

    const days = Math.floor(hours / 24);
    if (days === 1) return 'ayer';
    if (days < 7) return `hace ${days} d`;

    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  }
}

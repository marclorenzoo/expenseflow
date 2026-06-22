import { Component, computed, effect, inject, input } from '@angular/core';
import { ActivityStore } from '@core/stores/activity.store';
import { ActivityLog } from '@core/services/activity.service';
import { Skeleton } from '@ui/components/skeleton/skeleton';
import { EmptyState } from '@ui/components/empty-state/empty-state';

@Component({
  selector: 'app-activity-feed',
  imports: [Skeleton, EmptyState],
  templateUrl: './activity-feed.html',
  styleUrl: './activity-feed.scss',
})
export class ActivityFeed {
  // groupId como input signal: el effect reacciona a cada cambio y recarga el
  // feed, así que al navegar a otro grupo se ven sus logs (no los del anterior).
  groupId = input.required<string>();

  protected readonly store = inject(ActivityStore);

  // Skeletons solo en la primera carga (sin datos aún), no en refrescos.
  protected readonly showSkeletons = computed(
    () => this.store.isLoading() && this.store.logs().length === 0,
  );

  protected readonly skeletonRows = [0, 1, 2];

  constructor() {
    effect(() => {
      const id = this.groupId();
      if (id) this.store.loadActivity(id);
    });
  }

  /** Iniciales (máx. 2) para el avatar de fallback. */
  protected initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  /** Mensaje humano en español según el tipo de actividad. */
  protected message(log: ActivityLog): string {
    const actor = log.actor?.name ?? 'Alguien';
    const d = log.data ?? {};
    const desc = d.expenseDescription ?? '';
    const member = d.memberName ?? '';

    switch (log.type) {
      case 'EXPENSE_CREATED': {
        const amount = this.formatAmount(d.expenseAmount, d.expenseCurrency);
        return `${actor} añadió el gasto '${desc}'${amount ? ` (${amount})` : ''}`;
      }
      case 'EXPENSE_UPDATED':
        return `${actor} editó el gasto '${desc}'`;
      case 'EXPENSE_DELETED':
        return `${actor} eliminó el gasto '${desc}'`;
      case 'MEMBER_ADDED':
        return `${actor} añadió a ${member} al grupo`;
      case 'MEMBER_REMOVED':
        return `${actor} eliminó a ${member} del grupo`;
      default:
        return `${actor} realizó una acción`;
    }
  }

  private formatAmount(amount?: number, currency?: string): string {
    if (amount === undefined || amount === null) return '';
    return `${amount} ${currency ?? 'EUR'}`;
  }

  /**
   * Tiempo relativo en español, sin librerías externas. Resuelve desde
   * "hace un momento" hasta meses.
   */
  protected relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    const diffSec = Math.floor((Date.now() - then) / 1000);

    if (diffSec < 60) return 'hace un momento';

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `hace ${diffMin} min`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `hace ${diffHour} h`;

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return 'ayer';
    if (diffDay < 7) return `hace ${diffDay} días`;

    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 4)
      return diffWeek === 1 ? 'hace 1 semana' : `hace ${diffWeek} semanas`;

    const diffMonth = Math.floor(diffDay / 30);
    return diffMonth <= 1 ? 'hace 1 mes' : `hace ${diffMonth} meses`;
  }
}

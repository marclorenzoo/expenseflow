import { Injectable, inject, signal, computed } from '@angular/core';
import {
  GroupsService,
  GroupBalances,
  Settlement,
} from '@core/services/groups.service';

@Injectable({ providedIn: 'root' })
export class BalancesStore {
  private groupsService = inject(GroupsService);

  private _balances = signal<GroupBalances | null>(null);
  private _loading = signal(false);
  private _error = signal('');

  readonly balances = this._balances.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly settlements = computed<Settlement[]>(
    () => this._balances()?.settlements ?? [],
  );
  readonly total = computed<number>(() => this._balances()?.total ?? 0);

  async loadBalances(groupId: string): Promise<void> {
    this._loading.set(true);
    this._error.set('');
    try {
      const data = await this.groupsService.getBalances(groupId);
      this._balances.set(data);
    } catch {
      this._error.set('No se pudieron cargar los balances');
    } finally {
      this._loading.set(false);
    }
  }
}

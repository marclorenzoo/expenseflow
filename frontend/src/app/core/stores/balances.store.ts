import { Injectable, inject, signal, computed } from '@angular/core';
import {
  GroupsService,
  GroupBalances,
  Settlement,
} from '@core/services/groups.service';
import { RealtimeService } from '@core/services/realtime.service';

@Injectable({ providedIn: 'root' })
export class BalancesStore {
  private groupsService = inject(GroupsService);
  private realtime = inject(RealtimeService);

  private _balances = signal<GroupBalances | null>(null);
  private _loading = signal(false);
  private _error = signal('');

  // Grupo cuyos balances están cargados ahora mismo. Sirve para filtrar los
  // eventos de realtime: solo refrescamos si el evento pertenece a este grupo.
  private _currentGroupId = signal<string | null>(null);

  constructor() {
    this.setupRealtime();
  }

  readonly balances = this._balances.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly settlements = computed<Settlement[]>(
    () => this._balances()?.settlements ?? [],
  );
  readonly total = computed<number>(() => this._balances()?.total ?? 0);

  async loadBalances(groupId: string): Promise<void> {
    this._currentGroupId.set(groupId);
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

  /**
   * Los balances dependen tanto de los gastos como de los miembros del grupo,
   * así que se recalculan ante cualquier evento de gasto o de miembro del grupo
   * cargado. Reutilizamos loadBalances (recálculo en el backend).
   *
   * Se llama una sola vez desde el constructor (singleton); los listeners se
   * persisten en RealtimeService y sobreviven a las reconexiones del socket.
   */
  private setupRealtime() {
    const refresh = (payload: { groupId?: string }) => {
      const current = this._currentGroupId();
      if (!current) return;
      // 'expense.updated' no trae groupId, pero el evento ya llega solo al room
      // del grupo correcto; el resto de eventos sí lo traen y los filtramos.
      if (payload?.groupId && payload.groupId !== current) return;
      this.loadBalances(current);
    };

    this.realtime.on('expense.created', refresh);
    this.realtime.on('expense.updated', refresh);
    this.realtime.on('expense.deleted', refresh);
    this.realtime.on('member.added', refresh);
    this.realtime.on('member.removed', refresh);
  }
}

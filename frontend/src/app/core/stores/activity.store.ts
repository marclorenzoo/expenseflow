import { Injectable, inject, signal } from '@angular/core';
import { ActivityService, ActivityLog } from '@core/services/activity.service';
import { RealtimeService } from '@core/services/realtime.service';

@Injectable({ providedIn: 'root' })
export class ActivityStore {
  private activityService = inject(ActivityService);
  private realtime = inject(RealtimeService);

  private _logs = signal<ActivityLog[]>([]);
  private _isLoading = signal<boolean>(false);
  private _currentGroupId = signal<string | null>(null);

  readonly logs = this._logs.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly currentGroupId = this._currentGroupId.asReadonly();

  constructor() {
    this.setupRealtime();
  }

  async loadActivity(groupId: string): Promise<void> {
    this._isLoading.set(true);
    try {
      const data = await this.activityService.getByGroup(groupId);
      this._logs.set(data);
      this._currentGroupId.set(groupId);
    } catch {
      // Silencioso: si falla la carga, dejamos el feed vacío. El historial
      // no es crítico y se reintentará al volver a entrar al grupo.
      this._logs.set([]);
      this._currentGroupId.set(groupId);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Suscribe el store a los eventos de negocio que generan actividad. Cuando
   * otro cliente crea/edita/borra un gasto o añade/quita un miembro del grupo
   * cargado, recargamos el feed con el método de carga existente.
   *
   * Se llama una sola vez desde el constructor (el store es singleton). Los
   * listeners se persisten en RealtimeService, así que sobreviven a las
   * reconexiones del socket aunque aquí nos suscribamos antes de conectar.
   */
  private setupRealtime() {
    const refresh = (payload: { groupId?: string }) => {
      const current = this._currentGroupId();
      if (!current) return;
      // 'expense.updated' no trae groupId, pero el evento ya llega solo al
      // room del grupo correcto; el resto sí lo traen y lo filtramos.
      if (payload?.groupId && payload.groupId !== current) return;
      this.loadActivity(current);
    };

    this.realtime.on('expense.created', refresh);
    this.realtime.on('expense.updated', refresh);
    this.realtime.on('expense.deleted', refresh);
    this.realtime.on('member.added', refresh);
    this.realtime.on('member.removed', refresh);
  }

  /** Reinicia el store (al cambiar de grupo o cerrar sesión). */
  clear(): void {
    this._logs.set([]);
    this._isLoading.set(false);
    this._currentGroupId.set(null);
  }
}

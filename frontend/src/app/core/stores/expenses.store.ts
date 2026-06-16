import { Injectable, inject, signal, computed } from '@angular/core';
import {
  ExpensesService,
  Expense,
  Category,
  CreateExpenseData,
  UpdateExpenseData,
} from '@core/services/expenses.service';
import { RealtimeService } from '@core/services/realtime.service';

@Injectable({ providedIn: 'root' })
export class ExpensesStore {
  private expensesService = inject(ExpensesService);
  private realtime = inject(RealtimeService);

  // Estado privado (escritura)
  private _expenses = signal<Expense[]>([]);
  private _loading = signal(false);
  private _error = signal('');

  // Grupo cuyos gastos están cargados ahora mismo. Sirve para filtrar los
  // eventos de realtime: solo refrescamos si el evento pertenece a este grupo.
  private _currentGroupId = signal<string | null>(null);

  constructor() {
    this.setupRealtime();
  }

  // Filtros
  private _categoryFilter = signal<Category[]>([]);
  private _dateFromFilter = signal<string | null>(null);
  private _dateToFilter = signal<string | null>(null);

  readonly categoryFilter = this._categoryFilter.asReadonly();
  readonly dateFromFilter = this._dateFromFilter.asReadonly();
  readonly dateToFilter = this._dateToFilter.asReadonly();
  readonly filteredExpenses = computed(() => {
    return this._expenses().filter((expense) => {
      // Condición 1: categoría
      const categoryOk =
        this._categoryFilter().length === 0 ||
        this._categoryFilter().includes(expense.category);

      // Condición 2: fecha desde
      const fromOk =
        !this._dateFromFilter() || expense.date >= this._dateFromFilter()!;

      // Condición 3: fecha hasta
      const toOk =
        !this._dateToFilter() || expense.date <= this._dateToFilter()!;

      // El gasto se queda si cumple las tres
      return categoryOk && fromOk && toOk;
    });
  });

  // Estado público (solo lectura)
  readonly expenses = this._expenses.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async loadExpenses(groupId: string) {
    this._currentGroupId.set(groupId);
    this._loading.set(true);
    this._error.set('');
    try {
      const data = await this.expensesService.getExpensesByGroup(groupId);
      this._expenses.set(data);
    } catch {
      this._error.set('No se pudieron cargar los gastos');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Suscribe el store a los eventos de gastos en tiempo real. Cuando otro
   * cliente crea/edita/borra un gasto del grupo cargado, refrescamos la lista
   * con el método de carga existente (sin in-place updates, por ahora).
   *
   * Se llama una sola vez desde el constructor (el store es singleton). Los
   * listeners se persisten en RealtimeService, así que sobreviven a las
   * reconexiones del socket aunque aquí nos suscribamos antes de conectar.
   */
  private setupRealtime() {
    const refresh = (payload: { groupId?: string }) => {
      const current = this._currentGroupId();
      if (!current) return;
      // 'expense.created'/'expense.deleted' traen groupId; 'expense.updated'
      // no, pero el evento ya llega solo al room del grupo correcto.
      if (payload?.groupId && payload.groupId !== current) return;
      this.loadExpenses(current);
    };

    this.realtime.on('expense.created', refresh);
    this.realtime.on('expense.updated', refresh);
    this.realtime.on('expense.deleted', refresh);
  }

  async createExpense(groupId: string, data: CreateExpenseData): Promise<void> {
    this._loading.set(true);
    this._error.set('');
    try {
      await this.expensesService.createExpense(groupId, data);
      await this.loadExpenses(groupId);
    } catch {
      this._error.set('No se pudo crear el gasto');
    } finally {
      this._loading.set(false);
    }
  }

  async updateExpense(
    groupId: string,
    id: string,
    data: UpdateExpenseData,
  ): Promise<void> {
    this._loading.set(true);
    this._error.set('');
    try {
      await this.expensesService.updateExpense(id, data);
      await this.loadExpenses(groupId);
    } catch {
      this._error.set('No se pudo actualizar el gasto');
    } finally {
      this._loading.set(false);
    }
  }

  async deleteExpense(groupId: string, id: string): Promise<void> {
    this._loading.set(true);
    this._error.set('');
    try {
      await this.expensesService.deleteExpense(id);
      await this.loadExpenses(groupId);
    } catch {
      this._error.set('No se pudo borrar el gasto');
    } finally {
      this._loading.set(false);
    }
  }

  setCategoryFilter(categories: Category[]) {
    this._categoryFilter.set(categories);
  }

  setDateFromFilter(date: string | null) {
    this._dateFromFilter.set(date);
  }

  setDateToFilter(date: string | null) {
    this._dateToFilter.set(date);
  }

  clearFilters() {
    this._categoryFilter.set([]);
    this._dateFromFilter.set(null);
    this._dateToFilter.set(null);
  }
}

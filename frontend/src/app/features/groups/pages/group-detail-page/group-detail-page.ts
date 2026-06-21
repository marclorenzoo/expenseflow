import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { Expense, Category } from '@core/services/expenses.service';
import { ExpensesStore } from '@core/stores/expenses.store';
import { GroupsStore } from '@core/stores/groups.store';
import { BalancesStore } from '@core/stores/balances.store';
import { Button } from '@ui/components/button/button';
import { Input } from '@ui/components/input/input';
import { Datepicker } from '@ui/components/datepicker/datepicker';
import { ToastService } from '@core/services/toast.service';
import { RealtimeService } from '@core/services/realtime.service';
import { Skeleton } from '@ui/components/skeleton/skeleton';
import { EmptyState } from '@ui/components/empty-state/empty-state';
import { ErrorState } from '@ui/components/error-state/error-state';
import {
  ExpenseForm,
  ExpenseFormPayload,
} from '@features/expenses/components/expense-form/expense-form';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-group-detail-page',
  imports: [
    NgOptimizedImage,
    Button,
    Input,
    Datepicker,
    Skeleton,
    EmptyState,
    ErrorState,
    ExpenseForm,
  ],
  templateUrl: './group-detail-page.html',
  styleUrl: './group-detail-page.scss',
})
export class GroupDetailPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly realtime = inject(RealtimeService);
  private readonly filterWrapper = viewChild<ElementRef>('filterWrapper');
  protected readonly imageBaseUrl = environment.socketUrl;

  // Id del grupo leído de forma REACTIVA de la ruta. Angular reutiliza este
  // componente al cambiar el :id, así que dependemos de este signal (no del
  // snapshot) para recargar los datos en cada navegación.
  protected readonly groupId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id'))),
    { initialValue: this.route.snapshot.paramMap.get('id') },
  );

  // Grupo al que nos hemos unido en el room de realtime; necesario para hacer
  // leave del grupo anterior al cambiar de :id y del último en ngOnDestroy.
  private joinedGroupId: string | null = null;

  protected readonly groupsStore = inject(GroupsStore);
  protected readonly expensesStore = inject(ExpensesStore);
  protected readonly balancesStore = inject(BalancesStore);

  constructor() {
    // Reacciona a cada cambio del :id de la ruta: sale del room anterior,
    // recarga los datos del grupo nuevo y se une a su room.
    effect(() => {
      const id = this.groupId();
      if (!id) {
        this.router.navigate(['/groups']);
        return;
      }

      if (this.joinedGroupId && this.joinedGroupId !== id) {
        this.realtime.leaveGroup(this.joinedGroupId);
      }

      this.loadGroupData(id);
      this.realtime.joinGroup(id);
      this.joinedGroupId = id;
    });
  }

  // Carga (o recarga) todos los datos que dependen del groupId.
  private loadGroupData(id: string) {
    return Promise.all([
      this.groupsStore.loadGroup(id),
      this.expensesStore.loadExpenses(id),
      this.balancesStore.loadBalances(id),
    ]);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!this.filterPanelOpen()) return;
    const el = this.filterWrapper()?.nativeElement;
    if (el && !el.contains(e.target as Node)) {
      this.filterPanelOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.filterPanelOpen.set(false);
  }

  // ── Edit group ────────────────────────────────────────────────────────
  protected editMode = signal(false);
  protected editName = signal('');
  protected editDescription = signal('');
  protected saving = signal(false);
  protected saveError = signal('');

  // ── Delete group ──────────────────────────────────────────────────────
  protected confirmDelete = signal(false);
  protected deleting = signal(false);
  protected deleteError = signal('');

  // ── Invite member ─────────────────────────────────────────────────────
  protected inviteEmail = signal('');
  protected inviting = signal(false);
  protected inviteError = signal('');

  // ── Remove member ─────────────────────────────────────────────────────
  protected removingId = signal<string | null>(null);
  protected removeError = signal('');

  // ── Group image ───────────────────────────────────────────────────────
  protected imageUploading = signal(false);
  protected imageDeletingGroup = signal(false);
  protected imageError = signal('');
  protected imageTimestamp = signal(Date.now());

  // ── Filter panel ──────────────────────────────────────────────────────
  protected filterPanelOpen = signal(false);

  // ── Expense form ──────────────────────────────────────────────────────
  protected showExpenseForm = signal(false);
  protected expenseSubmitting = signal(false);
  protected expenseFormError = signal('');
  protected deletingExpenseId = signal<string | null>(null);
  protected editingExpenseId = signal<string | null>(null);
  protected editingExpense = signal<Expense | null>(null);

  // ── Filter helpers ────────────────────────────────────────────────────
  protected hasActiveFilters = computed(
    () =>
      this.expensesStore.categoryFilter().length > 0 ||
      this.expensesStore.dateFromFilter() !== null ||
      this.expensesStore.dateToFilter() !== null,
  );

  protected activeFilterCount = computed(() => {
    let n = 0;
    if (this.expensesStore.categoryFilter().length > 0) n++;
    if (this.expensesStore.dateFromFilter() !== null) n++;
    if (this.expensesStore.dateToFilter() !== null) n++;
    return n;
  });

  // ── Presentation computed ─────────────────────────────────────────────
  protected debtorGroups = computed(() => {
    const settlements = this.balancesStore.settlements();
    const currentUserId = this.authService.user()?.id;
    const imageByMemberId = new Map(
      (this.groupsStore.currentGroup()?.members ?? []).map((m) => [
        m.user.id,
        m.user.imageUrl,
      ]),
    );
    const map = new Map<
      string,
      {
        fromId: string;
        fromName: string;
        fromImageUrl: string | undefined;
        debts: { toId: string; toName: string; amount: number }[];
      }
    >();
    for (const s of settlements) {
      if (!map.has(s.fromId)) {
        map.set(s.fromId, {
          fromId: s.fromId,
          fromName: s.fromName,
          fromImageUrl: imageByMemberId.get(s.fromId),
          debts: [],
        });
      }
      map
        .get(s.fromId)!
        .debts.push({ toId: s.toId, toName: s.toName, amount: s.amount });
    }
    return [...map.values()].sort((a, b) => {
      if (a.fromId === currentUserId) return -1;
      if (b.fromId === currentUserId) return 1;
      return 0;
    });
  });

  protected initials = computed(() => {
    const name = this.groupsStore.currentGroup()?.name ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  });

  // Etiqueta visual (clase + texto) por categoría para los "cat-tag" del diseño
  protected readonly CATEGORY_TAGS: Record<
    Category,
    { cls: string; label: string }
  > = {
    food: { cls: 'comida', label: 'COMIDA' },
    transport: { cls: 'transporte', label: 'TRANSPORTE' },
    accommodation: { cls: 'alojamiento', label: 'ALOJAMIENTO' },
    entertainment: { cls: 'ocio', label: 'ENTRETENIMIENTO' },
    shopping: { cls: 'compras', label: 'COMPRAS' },
    health: { cls: 'salud', label: 'SALUD' },
    other: { cls: 'otro', label: 'OTRO' },
  };

  protected categoryTag(cat: Category): { cls: string; label: string } {
    return this.CATEGORY_TAGS[cat] ?? this.CATEGORY_TAGS['other'];
  }

  protected readonly CATEGORIES: { value: Category; label: string }[] = [
    { value: 'food', label: 'Comida' },
    { value: 'transport', label: 'Transporte' },
    { value: 'accommodation', label: 'Alojamiento' },
    { value: 'entertainment', label: 'Entretenimiento' },
    { value: 'shopping', label: 'Compras' },
    { value: 'health', label: 'Salud' },
    { value: 'other', label: 'Otro' },
  ];

  ngOnDestroy() {
    if (this.joinedGroupId) {
      this.realtime.leaveGroup(this.joinedGroupId);
      this.joinedGroupId = null;
    }
  }

  protected retryLoad() {
    const id = this.groupId();
    if (id) this.loadGroupData(id);
  }

  protected retryBalances() {
    const id = this.groupId();
    if (id) this.balancesStore.loadBalances(id);
  }

  protected goBack() {
    this.router.navigate(['/groups']);
  }

  protected toggleFilterPanel() {
    this.filterPanelOpen.update((v) => !v);
  }

  protected toggleCategoryFilter(value: Category) {
    const current = this.expensesStore.categoryFilter();
    if (current.includes(value)) {
      this.expensesStore.setCategoryFilter(current.filter((c) => c !== value));
    } else {
      this.expensesStore.setCategoryFilter([...current, value]);
    }
  }

  protected clearFilters() {
    this.expensesStore.clearFilters();
  }

  protected enterEdit() {
    const g = this.groupsStore.currentGroup();
    if (!g) return;
    this.editName.set(g.name);
    this.editDescription.set(g.description ?? '');
    this.saveError.set('');
    this.editMode.set(true);
  }

  protected cancelEdit() {
    this.editMode.set(false);
    this.saveError.set('');
  }

  protected async saveEdit() {
    const g = this.groupsStore.currentGroup();
    if (!g) return;
    const name = this.editName().trim();
    if (!name) return;

    this.saving.set(true);
    this.saveError.set('');

    await this.groupsStore.updateGroup(g.id, {
      name,
      description: this.editDescription().trim() || undefined,
    });

    if (this.groupsStore.error()) {
      this.saveError.set(this.groupsStore.error());
    } else {
      this.editMode.set(false);
    }
    this.saving.set(false);
  }

  protected async confirmAndDelete() {
    const g = this.groupsStore.currentGroup();
    if (!g) return;

    this.deleting.set(true);
    this.deleteError.set('');

    await this.groupsStore.deleteGroup(g.id);

    if (this.groupsStore.error()) {
      this.deleteError.set(this.groupsStore.error());
      this.deleting.set(false);
    } else {
      this.router.navigate(['/groups']);
    }
  }

  protected async inviteMember() {
    const g = this.groupsStore.currentGroup();
    const email = this.inviteEmail().trim();
    if (!g || !email) return;

    this.inviting.set(true);
    this.inviteError.set('');

    await this.groupsStore.addMember(g.id, email);

    if (this.groupsStore.error()) {
      this.inviteError.set(this.groupsStore.error());
    } else {
      this.inviteEmail.set('');
    }
    this.inviting.set(false);
  }

  protected async removeMember(userId: string) {
    const g = this.groupsStore.currentGroup();
    if (!g) return;

    this.removingId.set(userId);
    this.removeError.set('');

    await this.groupsStore.removeMember(g.id, userId);

    if (this.groupsStore.error()) {
      this.removeError.set(this.groupsStore.error());
    }
    this.removingId.set(null);
  }

  protected memberInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected openExpenseForm(expense?: Expense) {
    this.editingExpense.set(expense ?? null);
    this.editingExpenseId.set(expense?.id ?? null);
    this.expenseFormError.set('');
    this.showExpenseForm.set(true);
  }

  protected cancelExpenseForm() {
    this.showExpenseForm.set(false);
    this.editingExpenseId.set(null);
    this.editingExpense.set(null);
    this.expenseFormError.set('');
  }

  protected async submitExpense(payload: ExpenseFormPayload) {
    const g = this.groupsStore.currentGroup();
    if (!g) return;

    this.expenseSubmitting.set(true);
    this.expenseFormError.set('');
    const editId = this.editingExpenseId();

    if (editId) {
      await this.expensesStore.updateExpense(g.id, editId, {
        description: payload.description,
        amount: payload.amount,
        category: payload.category,
        date: payload.date,
        participantIds: payload.participantIds,
        currency: payload.currency,
      });
    } else {
      await this.expensesStore.createExpense(g.id, {
        description: payload.description,
        amount: payload.amount,
        category: payload.category,
        paidById: payload.paidById,
        date: payload.date,
        participantIds: payload.participantIds,
        currency: payload.currency,
      });
    }

    if (this.expensesStore.error()) {
      this.expenseFormError.set(this.expensesStore.error());
      this.toastService.show(
        editId
          ? 'No hemos podido guardar los cambios. Inténtalo de nuevo.'
          : 'No hemos podido crear el gasto. Comprueba los datos e inténtalo de nuevo.',
        'error',
      );
    } else {
      this.showExpenseForm.set(false);
      this.editingExpenseId.set(null);
      this.editingExpense.set(null);
      this.toastService.show(
        editId ? 'Gasto actualizado' : 'Gasto creado',
        'success',
      );
      this.balancesStore.loadBalances(g.id);
    }

    this.expenseSubmitting.set(false);
  }

  protected async deleteExpense(id: string) {
    const g = this.groupsStore.currentGroup();
    if (!g) return;
    this.deletingExpenseId.set(id);

    await this.expensesStore.deleteExpense(g.id, id);

    if (this.expensesStore.error()) {
      this.toastService.show(
        'No hemos podido eliminar el gasto. Inténtalo de nuevo.',
        'error',
      );
    } else {
      this.toastService.show('Gasto eliminado', 'success');
      this.balancesStore.loadBalances(g.id);
    }

    this.deletingExpenseId.set(null);
  }

  protected async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const g = this.groupsStore.currentGroup();
    if (!file || !g) return;

    this.imageUploading.set(true);
    this.imageError.set('');

    await this.groupsStore.uploadGroupImage(g.id, file);

    if (this.groupsStore.error()) {
      this.imageError.set(this.groupsStore.error());
    } else {
      this.imageTimestamp.set(Date.now());
    }
    this.imageUploading.set(false);
    input.value = '';
  }

  protected async deleteGroupImage() {
    const g = this.groupsStore.currentGroup();
    if (!g) return;

    this.imageDeletingGroup.set(true);
    this.imageError.set('');

    await this.groupsStore.deleteGroupImage(g.id);

    if (this.groupsStore.error()) {
      this.imageError.set(this.groupsStore.error());
    } else {
      this.imageTimestamp.set(Date.now());
    }
    this.imageDeletingGroup.set(false);
  }

  protected categoryLabel(cat: Category): string {
    return this.CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  }
}

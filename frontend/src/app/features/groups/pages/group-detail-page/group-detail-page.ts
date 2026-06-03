import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import {
  ExpensesService,
  Expense,
  Category,
} from '@core/services/expenses.service';
import { ExpensesStore } from '@core/stores/expenses.store';
import { GroupsStore } from '@core/stores/groups.store';
import { BalancesStore } from '@core/stores/balances.store';
import { Card } from '@ui/components/card/card';
import { Button } from '@ui/components/button/button';
import { Input } from '@ui/components/input/input';
import { Datepicker } from '@ui/components/datepicker/datepicker';
import { ToastService } from '@core/services/toast.service';
import { Skeleton } from '@ui/components/skeleton/skeleton';
import { EmptyState } from '@ui/components/empty-state/empty-state';
import { ErrorState } from '@ui/components/error-state/error-state';

@Component({
  selector: 'app-group-detail-page',
  imports: [Card, Button, Input, Datepicker, Skeleton, EmptyState, ErrorState],
  templateUrl: './group-detail-page.html',
  styleUrl: './group-detail-page.scss',
})
export class GroupDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly expensesService = inject(ExpensesService);
  protected readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly filterWrapper = viewChild<ElementRef>('filterWrapper');

  protected readonly groupsStore = inject(GroupsStore);
  protected readonly expensesStore = inject(ExpensesStore);
  protected readonly balancesStore = inject(BalancesStore);

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
  protected expenseDescription = signal('');
  protected expenseAmount = signal('');
  protected expenseCategory = signal<Category>('other');
  protected expensePaidById = signal('');
  protected expenseDate = signal('');
  protected expenseSubmitting = signal(false);
  protected expenseTouched = signal({ description: false, amount: false });
  protected expenseFormError = signal('');
  protected expenseCurrency = signal('EUR');
  protected expenseParticipantIds = signal<string[]>([]);
  protected expenseFormLoading = signal(false);
  protected deletingExpenseId = signal<string | null>(null);
  protected editingExpenseId = signal<string | null>(null);

  protected expenseFormErrors = computed(() => ({
    description:
      this.expenseTouched().description &&
      (this.expenseDescription().trim().length === 0
        ? 'La descripción es obligatoria'
        : this.expenseDescription().trim().length < 3
          ? 'Mínimo 3 caracteres'
          : ''),
    amount:
      this.expenseTouched().amount &&
      (this.expenseAmount() === ''
        ? 'El importe es obligatorio'
        : parseFloat(this.expenseAmount()) <= 0
          ? 'El importe debe ser mayor que 0'
          : ''),
    participants:
      this.expenseParticipantIds().length === 0
        ? 'Selecciona al menos un participante'
        : '',
  }));

  protected expenseFormValid = computed(
    () =>
      !this.expenseFormErrors().description &&
      !this.expenseFormErrors().amount &&
      !this.expenseFormErrors().participants,
  );

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

  protected readonly CATEGORIES: { value: Category; label: string }[] = [
    { value: 'food', label: 'Comida' },
    { value: 'transport', label: 'Transporte' },
    { value: 'accommodation', label: 'Alojamiento' },
    { value: 'entertainment', label: 'Entretenimiento' },
    { value: 'shopping', label: 'Compras' },
    { value: 'health', label: 'Salud' },
    { value: 'other', label: 'Otro' },
  ];

  protected readonly CURRENCIES = [
    { value: 'EUR', label: '€ Euro' },
    { value: 'USD', label: '$ Dólar' },
    { value: 'GBP', label: '£ Libra' },
    { value: 'CHF', label: 'CHF Franco suizo' },
    { value: 'JPY', label: '¥ Yen' },
    { value: 'MXN', label: 'MX$ Peso mexicano' },
  ];

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/groups']);
      return;
    }

    await Promise.all([
      this.groupsStore.loadGroup(id),
      this.expensesStore.loadExpenses(id),
      this.balancesStore.loadBalances(id),
    ]);
  }

  protected retryLoad() {
    this.ngOnInit();
  }

  protected retryBalances() {
    const id = this.route.snapshot.paramMap.get('id');
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

  protected touchDescription() {
    this.expenseTouched.set({ ...this.expenseTouched(), description: true });
  }

  protected touchAmount() {
    this.expenseTouched.set({ ...this.expenseTouched(), amount: true });
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

  protected async openExpenseForm(expense?: Expense) {
    this.expenseCurrency.set(expense?.currency ?? 'EUR');
    this.expenseTouched.set({ description: false, amount: false });
    const g = this.groupsStore.currentGroup();
    if (!g) return;
    const allMemberIds = g.members.map((m) => m.user.id);

    if (expense) {
      this.editingExpenseId.set(expense.id);
      this.expenseDescription.set(expense.description);
      this.expenseAmount.set(String(expense.amount));
      this.expenseCategory.set(expense.category);
      this.expensePaidById.set(expense.paidBy.id);
      this.expenseDate.set(expense.date.substring(0, 10));
      this.expenseParticipantIds.set(allMemberIds);
      this.expenseFormError.set('');
      this.showExpenseForm.set(true);

      this.expenseFormLoading.set(true);
      try {
        const detail = await this.expensesService.getExpense(expense.id);
        const participantIds = detail.splits.map((s) => s.userId);
        this.expenseParticipantIds.set(
          participantIds.length > 0 ? participantIds : allMemberIds,
        );
      } catch {
        // keep all selected as fallback
      } finally {
        this.expenseFormLoading.set(false);
      }
    } else {
      this.editingExpenseId.set(null);
      this.expenseDescription.set('');
      this.expenseAmount.set('');
      this.expenseCategory.set('other');
      this.expensePaidById.set(
        this.authService.user()?.id ?? g.members[0]?.user.id ?? '',
      );
      this.expenseDate.set(new Date().toISOString().substring(0, 10));
      this.expenseParticipantIds.set(allMemberIds);
      this.expenseFormError.set('');
      this.showExpenseForm.set(true);
    }
  }

  protected toggleParticipant(userId: string) {
    const current = this.expenseParticipantIds();
    if (current.includes(userId)) {
      this.expenseParticipantIds.set(current.filter((id) => id !== userId));
    } else {
      this.expenseParticipantIds.set([...current, userId]);
    }
  }

  protected cancelExpenseForm() {
    this.showExpenseForm.set(false);
    this.editingExpenseId.set(null);
    this.expenseFormError.set('');
  }

  protected async submitExpense() {
    const g = this.groupsStore.currentGroup();
    if (!g) return;
    const description = this.expenseDescription().trim();
    const amount = parseFloat(this.expenseAmount());
    const participantIds = this.expenseParticipantIds();
    const currency = this.expenseCurrency();
    if (
      !description ||
      isNaN(amount) ||
      amount <= 0 ||
      !this.expensePaidById() ||
      participantIds.length === 0
    )
      return;

    this.expenseSubmitting.set(true);
    this.expenseFormError.set('');
    const editId = this.editingExpenseId();

    if (editId) {
      await this.expensesStore.updateExpense(g.id, editId, {
        description,
        amount,
        category: this.expenseCategory(),
        date: this.expenseDate()
          ? new Date(this.expenseDate()).toISOString()
          : undefined,
        participantIds,
        currency,
      });
    } else {
      await this.expensesStore.createExpense(g.id, {
        description,
        amount,
        category: this.expenseCategory(),
        paidById: this.expensePaidById(),
        date: this.expenseDate()
          ? new Date(this.expenseDate()).toISOString()
          : undefined,
        participantIds,
        currency,
      });
    }

    if (this.expensesStore.error()) {
      this.expenseFormError.set(this.expensesStore.error());
      this.toastService.show(
        editId ? 'Error al actualizar el gasto' : 'Error al crear el gasto',
        'error',
      );
    } else {
      this.showExpenseForm.set(false);
      this.editingExpenseId.set(null);
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
      this.toastService.show('Error al eliminar el gasto', 'error');
    } else {
      this.toastService.show('Gasto borrado correctamente', 'success');
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

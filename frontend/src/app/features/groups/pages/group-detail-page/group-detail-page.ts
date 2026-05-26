import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  GroupsService,
  GroupDetail,
  GroupBalances,
} from '@core/services/groups.service';
import { AuthService } from '@core/services/auth.service';
import {
  ExpensesService,
  Expense,
  Category,
} from '@core/services/expenses.service';
import { Card } from '@ui/components/card/card';
import { Button } from '@ui/components/button/button';
import { Input } from '@ui/components/input/input';
import { Datepicker } from '@ui/components/datepicker/datepicker';

@Component({
  selector: 'app-group-detail-page',
  imports: [Card, Button, Input, Datepicker],
  templateUrl: './group-detail-page.html',
  styleUrl: './group-detail-page.scss',
})
export class GroupDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly groupsService = inject(GroupsService);
  private readonly expensesService = inject(ExpensesService);
  protected readonly authService = inject(AuthService);

  protected group = signal<GroupDetail | null>(null);
  protected loading = signal(true);
  protected loadError = signal('');

  protected editMode = signal(false);
  protected editName = signal('');
  protected editDescription = signal('');
  protected saving = signal(false);
  protected saveError = signal('');

  protected confirmDelete = signal(false);
  protected deleting = signal(false);
  protected deleteError = signal('');

  protected inviteEmail = signal('');
  protected inviting = signal(false);
  protected inviteError = signal('');

  protected removingId = signal<string | null>(null);
  protected removeError = signal('');

  protected imageUploading = signal(false);
  protected imageDeletingGroup = signal(false);
  protected imageError = signal('');
  protected imageTimestamp = signal(Date.now());

  // ── Expenses ──────────────────────────────────────────────────────────
  protected expenses = signal<Expense[]>([]);
  protected expensesLoading = signal(false);
  protected expensesError = signal('');

  protected touchDescription() {
    this.expenseTouched.set({ ...this.expenseTouched(), description: true });
  }

  protected touchAmount() {
    this.expenseTouched.set({ ...this.expenseTouched(), amount: true });
  }
  protected showExpenseForm = signal(false);
  protected expenseDescription = signal('');
  protected expenseAmount = signal('');
  protected expenseCategory = signal<Category>('other');
  protected expensePaidById = signal('');
  protected expenseDate = signal('');
  protected expenseSubmitting = signal(false);
  protected expenseTouched = signal({
    description: false,
    amount: false,
  });
  protected expenseFormError = signal('');
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

  protected expenseParticipantIds = signal<string[]>([]);
  protected expenseFormLoading = signal(false);
  protected deletingExpenseId = signal<string | null>(null);
  protected editingExpenseId = signal<string | null>(null);

  // ── Balances ───────────────────────────────────────────────────────────
  protected balances = signal<GroupBalances | null>(null);
  protected balancesLoading = signal(false);
  protected balancesError = signal('');
  protected expenseCurrency = signal('EUR');

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

  protected isAdmin = computed(() => {
    const userId = this.authService.user()?.id;
    return (
      this.group()?.members.some(
        (m) => m.user.id === userId && m.role === 'admin',
      ) ?? false
    );
  });

  protected initials = computed(() => {
    const name = this.group()?.name ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/groups']);
      return;
    }

    try {
      const [group, expenses] = await Promise.all([
        this.groupsService.getGroup(id),
        this.expensesService.getExpensesByGroup(id),
      ]);
      this.group.set(group);
      this.expenses.set(expenses);
      this.loadBalances(id);
    } catch {
      this.loadError.set('No se pudo cargar el grupo');
    } finally {
      this.loading.set(false);
    }
  }

  protected async loadBalances(groupId: string) {
    this.balancesLoading.set(true);
    this.balancesError.set('');
    try {
      const result = await this.groupsService.getBalances(groupId);
      this.balances.set(result);
    } catch {
      this.balancesError.set('No se pudieron cargar los balances');
    } finally {
      this.balancesLoading.set(false);
    }
  }

  protected goBack() {
    this.router.navigate(['/groups']);
  }

  protected enterEdit() {
    const g = this.group();
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
    const g = this.group();
    if (!g) return;
    const name = this.editName().trim();
    if (!name) return;

    this.saving.set(true);
    this.saveError.set('');

    try {
      const updated = await this.groupsService.updateGroup(
        g.id,
        name,
        this.editDescription().trim() || undefined,
      );
      this.group.update((prev) =>
        prev
          ? { ...prev, name: updated.name, description: updated.description }
          : prev,
      );
      this.editMode.set(false);
    } catch (err: any) {
      this.saveError.set(err.error?.message || 'Error al guardar los cambios');
    } finally {
      this.saving.set(false);
    }
  }

  protected async confirmAndDelete() {
    const g = this.group();
    if (!g) return;

    this.deleting.set(true);
    this.deleteError.set('');

    try {
      await this.groupsService.deleteGroup(g.id);
      this.router.navigate(['/groups']);
    } catch (err: any) {
      this.deleteError.set(err.error?.message || 'Error al eliminar el grupo');
      this.deleting.set(false);
    }
  }

  protected async inviteMember() {
    const g = this.group();
    const email = this.inviteEmail().trim();
    if (!g || !email) return;

    this.inviting.set(true);
    this.inviteError.set('');

    try {
      await this.groupsService.addMember(g.id, email);
      this.inviteEmail.set('');
      const updated = await this.groupsService.getGroup(g.id);
      this.group.set(updated);
    } catch (err: any) {
      this.inviteError.set(err.error?.message || 'Error al invitar al miembro');
    } finally {
      this.inviting.set(false);
    }
  }

  protected async removeMember(userId: string) {
    const g = this.group();
    if (!g) return;

    this.removingId.set(userId);
    this.removeError.set('');

    try {
      await this.groupsService.removeMember(g.id, userId);
      const updated = await this.groupsService.getGroup(g.id);
      this.group.set(updated);
    } catch (err: any) {
      this.removeError.set(
        err.error?.message || 'Error al eliminar el miembro',
      );
    } finally {
      this.removingId.set(null);
    }
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
    const g = this.group();
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
    const g = this.group();
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

    try {
      const editId = this.editingExpenseId();
      if (editId) {
        await this.expensesService.updateExpense(editId, {
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
        await this.expensesService.createExpense(g.id, {
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
      const updated = await this.expensesService.getExpensesByGroup(g.id);
      this.expenses.set(updated);
      this.showExpenseForm.set(false);
      this.editingExpenseId.set(null);
      this.loadBalances(g.id);
    } catch (err: any) {
      this.expenseFormError.set(
        err.error?.message || 'Error al guardar el gasto',
      );
    } finally {
      this.expenseSubmitting.set(false);
    }
  }

  protected async deleteExpense(id: string) {
    const g = this.group();
    if (!g) return;
    this.deletingExpenseId.set(id);
    try {
      await this.expensesService.deleteExpense(id);
      const updated = await this.expensesService.getExpensesByGroup(g.id);
      this.expenses.set(updated);
      this.loadBalances(g.id);
    } catch {
      // silently ignore
    } finally {
      this.deletingExpenseId.set(null);
    }
  }

  protected async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const g = this.group();
    if (!file || !g) return;

    this.imageUploading.set(true);
    this.imageError.set('');
    try {
      await this.groupsService.uploadGroupImage(g.id, file);
      const updated = await this.groupsService.getGroup(g.id);
      this.group.set(updated);
      this.imageTimestamp.set(Date.now());
    } catch (err: any) {
      this.imageError.set(err.error?.message || 'Error al subir la imagen');
    } finally {
      this.imageUploading.set(false);
      input.value = '';
    }
  }

  protected async deleteGroupImage() {
    const g = this.group();
    if (!g) return;

    this.imageDeletingGroup.set(true);
    this.imageError.set('');
    try {
      await this.groupsService.deleteGroupImage(g.id);
      const updated = await this.groupsService.getGroup(g.id);
      this.group.set(updated);
      this.imageTimestamp.set(Date.now());
    } catch (err: any) {
      this.imageError.set(err.error?.message || 'Error al eliminar la imagen');
    } finally {
      this.imageDeletingGroup.set(false);
    }
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

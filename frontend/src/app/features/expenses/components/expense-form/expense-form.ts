import {
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { GroupDetail } from '@core/services/groups.service';
import {
  Category,
  Expense,
  ExpensesService,
} from '@core/services/expenses.service';
import { Button } from '@ui/components/button/button';
import { Input } from '@ui/components/input/input';
import { Datepicker } from '@ui/components/datepicker/datepicker';
import { ReceiptUploader } from '@ui/components/receipt-uploader/receipt-uploader';

export interface ExpenseFormPayload {
  description: string;
  amount: number;
  category: Category;
  paidById: string;
  date: string | undefined;
  participantIds: string[];
  currency: string;
}

@Component({
  selector: 'app-expense-form',
  imports: [Button, Input, Datepicker, ReceiptUploader],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.scss',
})
export class ExpenseForm implements OnInit {
  private readonly expensesService = inject(ExpensesService);

  // ── Inputs ────────────────────────────────────────────────────────────
  readonly group = input.required<GroupDetail>();
  readonly expense = input<Expense | null>(null);
  readonly currentUserId = input<string | undefined>(undefined);
  readonly submitting = input(false);
  readonly formError = input('');

  // ── Outputs ───────────────────────────────────────────────────────────
  readonly save = output<ExpenseFormPayload>();
  readonly cancel = output<void>();

  // ── Form state ────────────────────────────────────────────────────────
  protected description = signal('');
  protected amount = signal('');
  protected category = signal<Category>('other');
  protected paidById = signal('');
  protected date = signal('');
  protected currency = signal('EUR');
  protected participantIds = signal<string[]>([]);
  protected touched = signal({ description: false, amount: false });
  protected participantsLoading = signal(false);

  protected readonly editing = computed(() => this.expense() !== null);

  protected formErrors = computed(() => ({
    description:
      this.touched().description &&
      (this.description().trim().length === 0
        ? 'La descripción es obligatoria'
        : this.description().trim().length < 3
          ? 'Mínimo 3 caracteres'
          : ''),
    amount:
      this.touched().amount &&
      (this.amount() === ''
        ? 'El importe es obligatorio'
        : parseFloat(this.amount()) <= 0
          ? 'El importe debe ser mayor que 0'
          : ''),
    participants:
      this.participantIds().length === 0
        ? 'Selecciona al menos un participante'
        : '',
  }));

  protected formValid = computed(
    () =>
      !this.formErrors().description &&
      !this.formErrors().amount &&
      !this.formErrors().participants,
  );

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
    const g = this.group();
    const expense = this.expense();
    const allMemberIds = g.members.map((m) => m.user.id);

    this.currency.set(expense?.currency ?? 'EUR');
    this.touched.set({ description: false, amount: false });

    if (expense) {
      this.description.set(expense.description);
      this.amount.set(String(expense.amount));
      this.category.set(expense.category);
      this.paidById.set(expense.paidBy.id);
      this.date.set(expense.date.substring(0, 10));
      this.participantIds.set(allMemberIds);

      this.participantsLoading.set(true);
      try {
        const detail = await this.expensesService.getExpense(expense.id);
        const participantIds = detail.splits.map((s) => s.userId);
        this.participantIds.set(
          participantIds.length > 0 ? participantIds : allMemberIds,
        );
      } catch {
        // keep all selected as fallback
      } finally {
        this.participantsLoading.set(false);
      }
    } else {
      this.description.set('');
      this.amount.set('');
      this.category.set('other');
      this.paidById.set(this.currentUserId() ?? g.members[0]?.user.id ?? '');
      this.date.set(new Date().toISOString().substring(0, 10));
      this.participantIds.set(allMemberIds);
    }
  }

  protected touchDescription() {
    this.touched.set({ ...this.touched(), description: true });
  }

  protected touchAmount() {
    this.touched.set({ ...this.touched(), amount: true });
  }

  protected toggleParticipant(userId: string) {
    const current = this.participantIds();
    if (current.includes(userId)) {
      this.participantIds.set(current.filter((id) => id !== userId));
    } else {
      this.participantIds.set([...current, userId]);
    }
  }

  protected memberInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected submit() {
    const description = this.description().trim();
    const amount = parseFloat(this.amount());
    const participantIds = this.participantIds();
    const currency = this.currency();
    if (
      !description ||
      isNaN(amount) ||
      amount <= 0 ||
      !this.paidById() ||
      participantIds.length === 0
    )
      return;

    this.save.emit({
      description,
      amount,
      category: this.category(),
      paidById: this.paidById(),
      date: this.date() ? new Date(this.date()).toISOString() : undefined,
      participantIds,
      currency,
    });
  }
}

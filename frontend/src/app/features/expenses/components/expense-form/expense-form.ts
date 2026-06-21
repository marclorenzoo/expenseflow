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
import { ToastService } from '@core/services/toast.service';
import { Button } from '@ui/components/button/button';
import { Input } from '@ui/components/input/input';
import { Datepicker } from '@ui/components/datepicker/datepicker';
import { ReceiptUploader } from '@ui/components/receipt-uploader/receipt-uploader';
import { FormsModule } from '@angular/forms';

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
  imports: [Button, Input, Datepicker, ReceiptUploader, FormsModule],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.scss',
})
export class ExpenseForm implements OnInit {
  private readonly expensesService = inject(ExpensesService);
  private readonly toastService = inject(ToastService);

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

  // ── Receipt ────────────────────────────────────────────────────────
  protected isParsing = signal(false);
  protected parsedFromReceipt = signal(false);

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

  /**
   * Mapea el nombre de un comercio a una categoría conocida buscando marcas y
   * palabras clave (en su mayoría del mercado español). Compara en minúsculas
   * con .includes(). Si nada coincide, devuelve 'other'.
   */
  private guessCategory(merchant: string): Category {
    const m = merchant.toLowerCase();

    const rules: { category: Category; keywords: string[] }[] = [
      {
        category: 'food',
        keywords: [
          // Supermercados
          'mercadona',
          'carrefour',
          'lidl',
          'aldi',
          'dia',
          'eroski',
          'alcampo',
          'consum',
          'caprabo',
          'hipercor',
          'supercor',
          'froiz',
          'gadis',
          'ahorramas',
          'simply',
          'condis',
          'bonpreu',
          'spar',
          'supermercado',
          'super',
          'hiper',
          'fruteria',
          'carniceria',
          'panaderia',
          'pasteleria',
          'pescaderia',
          'mercado',
          // Restaurantes / fast food / cafeterías
          'restaurante',
          'restaurant',
          'bar ',
          'cafeteria',
          'cafe',
          'cerveceria',
          'taberna',
          'asador',
          'pizzeria',
          'pizza',
          'mcdonald',
          'burger king',
          'burguer',
          'kfc',
          'telepizza',
          'dominos',
          'goiko',
          'tgb',
          'five guys',
          'foster',
          'vips',
          '100 montaditos',
          'rodilla',
          'pans',
          'subway',
          'starbucks',
          'taco bell',
          'kebab',
          'sushi',
          'glovo',
          'just eat',
          'uber eats',
          'deliveroo',
        ],
      },
      {
        category: 'transport',
        keywords: [
          // Transporte público / taxi / VTC
          'renfe',
          'alsa',
          'metro',
          'emt',
          'tmb',
          'cercanias',
          'ave',
          'iryo',
          'ouigo',
          'avlo',
          'autobus',
          'bus ',
          'taxi',
          'cabify',
          'uber',
          'bolt',
          'free now',
          'blablacar',
          'parking',
          'aparcamiento',
          'peaje',
          'autopista',
          'bicimad',
          'bizkaibus',
          'fgc',
          // Gasolineras
          'repsol',
          'cepsa',
          'galp',
          'shell',
          'bp ',
          'petronor',
          'gasolinera',
          'carburante',
          'estacion de servicio',
          'ballenoil',
          'plenoil',
        ],
      },
      {
        category: 'accommodation',
        keywords: [
          'hotel',
          'hostal',
          'hostel',
          'pension',
          'parador',
          'booking',
          'airbnb',
          'expedia',
          'trivago',
          'hostelworld',
          'nh ',
          'melia',
          'barcelo',
          'riu',
          'iberostar',
          'eurostars',
          'ibis',
          'marriott',
          'hilton',
          'apartamento',
          'camping',
          'resort',
          'albergue',
        ],
      },
      {
        category: 'entertainment',
        keywords: [
          // Streaming / ocio digital
          'netflix',
          'spotify',
          'hbo',
          'max',
          'disney',
          'amazon prime',
          'prime video',
          'youtube',
          'twitch',
          'apple music',
          'apple tv',
          'movistar plus',
          'dazn',
          'filmin',
          'crunchyroll',
          'audible',
          'playstation',
          'xbox',
          'nintendo',
          'steam',
          'epic games',
          // Cine / cultura / ocio
          'cine',
          'cinesa',
          'yelmo',
          'kinepolis',
          'teatro',
          'concierto',
          'museo',
          'entradas',
          'ticketmaster',
          'fnac',
          'discoteca',
          'parque',
          'bolera',
        ],
      },
      {
        category: 'health',
        keywords: [
          'farmacia',
          'parafarmacia',
          'hospital',
          'clinica',
          'clínica',
          'centro de salud',
          'ambulatorio',
          'medico',
          'médico',
          'dentista',
          'dental',
          'optica',
          'óptica',
          'fisioterapia',
          'fisio',
          'sanitas',
          'adeslas',
          'dkv',
          'asisa',
          'laboratorio',
          'analisis',
          'veterinaria',
          'veterinario',
        ],
      },
      {
        category: 'shopping',
        keywords: [
          'amazon',
          'el corte ingles',
          'aliexpress',
          'zara',
          'mango',
          'pull',
          'bershka',
          'stradivarius',
          'massimo dutti',
          'oysho',
          'h&m',
          'primark',
          'shein',
          'decathlon',
          'ikea',
          'leroy merlin',
          'bricomart',
          'bricodepot',
          'mediamarkt',
          'pccomponentes',
          'worten',
          'fnac',
          'apple store',
          'nike',
          'adidas',
          'sprinter',
          'jd ',
          'springfield',
          'cortefiel',
          'tienda',
          'libreria',
          'juguetes',
          'perfumeria',
          'druni',
          'primor',
          'sephora',
          'normal',
          'tiger',
          'flying tiger',
          'action',
        ],
      },
    ];

    for (const rule of rules) {
      if (rule.keywords.some((k) => m.includes(k))) {
        return rule.category;
      }
    }

    return 'other';
  }

  async onReceiptSelected(file: File): Promise<void> {
    this.isParsing.set(true);
    try {
      const parsed = await this.expensesService.parseReceipt(file);

      if (
        parsed.total === null &&
        parsed.merchant === null &&
        parsed.date === null
      ) {
        this.toastService.show(
          'No hemos podido detectar un ticket en la imagen. Revisa que se vea claro o rellena los campos manualmente.',
          'error',
        );
        return;
      }

      if (parsed.total) {
        this.amount.set(parsed.total.toString());
      }

      if (parsed.date) {
        this.date.set(parsed.date);
      }

      if (parsed.merchant) {
        this.description.set(parsed.merchant);
        this.category.set(this.guessCategory(parsed.merchant));
      }

      this.parsedFromReceipt.set(true);
    } catch (error) {
      console.error('Error al procesar el ticket:', error);
      this.toastService.show(
        'No hemos podido procesar el ticket. Inténtalo de nuevo.',
        'error',
      );
    } finally {
      this.isParsing.set(false);
    }
  }
}

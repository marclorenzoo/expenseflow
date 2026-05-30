import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Card } from '@ui/components/card/card';
import { Chart } from '@ui/components/chart/chart';
import { UsersService, UserStats } from '@core/services/users.service';
import type {
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexStroke,
  ApexFill,
  ApexGrid,
  ApexTooltip,
  ApexDataLabels,
  ApexPlotOptions,
  ApexLegend,
} from 'ng-apexcharts';

const MONTHS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];
const FALLBACK_DATA = [
  421, 308, 567, 489, 723, 612, 445, 398, 534, 687, 502, 459,
];

const DONUT_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#ec4899',
];

@Component({
  selector: 'app-analytics-page',
  imports: [Card, Chart, DecimalPipe],
  templateUrl: './analytics-page.html',
  styleUrl: './analytics-page.scss',
})
export class AnalyticsPage implements OnInit {
  private usersService = inject(UsersService);

  stats = signal<UserStats | null>(null);
  loading = signal(true);

  donutSeries = computed(
    () => this.stats()?.categoryBreakdown.map((c) => c.total) ?? [],
  );
  donutLabels = computed(
    () => this.stats()?.categoryBreakdown.map((c) => c.category) ?? [],
  );

  // ── Area chart ─────────────────────────────────────────────────────────────
  series = computed(() => {
    const trend = this.stats()?.monthlyTrend;
    const data = trend
      ? [...trend].sort((a, b) => a.month - b.month).map((m) => m.total)
      : FALLBACK_DATA;
    return [{ name: 'Gastos', data }];
  });
  readonly currentYear = new Date().getFullYear();
  readonly colors = ['#6366f1'];

  readonly chartConfig: ApexChart = {
    type: 'area',
    height: 300,
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'Inter, system-ui, sans-serif',
    foreColor: '#64748b',
  };

  readonly xaxis: ApexXAxis = {
    categories: MONTHS,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#94a3b8', fontSize: '12px' } },
    crosshairs: { show: true, stroke: { color: '#6366f1', dashArray: 4 } },
  };

  readonly yaxis: ApexYAxis = {
    min: 0,
    tickAmount: 4,
    labels: {
      formatter: (val: number) => `${val}€`,
      style: { colors: '#94a3b8', fontSize: '12px' },
    },
  };

  readonly stroke: ApexStroke = { curve: 'smooth', width: 2 };

  readonly fill: ApexFill = {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.3,
      opacityTo: 0.03,
      stops: [0, 100],
      colorStops: [
        { offset: 0, color: '#6366f1', opacity: 0.3 },
        { offset: 100, color: '#6366f1', opacity: 0.03 },
      ],
    },
  };

  readonly grid: ApexGrid = {
    borderColor: '#e2e8f0',
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
    padding: { top: 4, right: 8, bottom: 0, left: 8 },
  };

  readonly tooltip: ApexTooltip = {
    theme: 'light',
    y: { formatter: (val: number) => `${val} €` },
    marker: { show: true },
  };

  readonly dataLabels: ApexDataLabels = { enabled: false };

  // ── Donut chart ─────────────────────────────────────────────────────────────
  readonly donutColors = DONUT_COLORS;

  readonly donutChartConfig: ApexChart = {
    type: 'donut',
    height: 300,
    toolbar: { show: false },
    fontFamily: 'Inter, system-ui, sans-serif',
    foreColor: '#64748b',
  };

  readonly donutPlotOptions: ApexPlotOptions = {
    pie: {
      donut: {
        size: '68%',
        labels: {
          show: true,
          total: {
            show: true,
            showAlways: true,
            label: 'Total',
            fontSize: '13px',
            color: '#64748b',
            formatter: (w: any) => {
              const sum: number = w.globals.seriesTotals.reduce(
                (a: number, b: number) => a + b,
                0,
              );
              return `${sum.toFixed(2)} €`;
            },
          },
          value: {
            show: true,
            fontSize: '18px',
            fontWeight: '700',
            color: '#0f172a',
            formatter: (val: string) => `${parseFloat(val).toFixed(2)} €`,
          },
        },
      },
    },
  };

  readonly donutDataLabels: ApexDataLabels = { enabled: false };

  readonly donutTooltip: ApexTooltip = {
    theme: 'light',
    y: { formatter: (val: number) => `${val.toFixed(2)} €` },
  };

  readonly donutLegend: ApexLegend = {
    position: 'bottom',
    horizontalAlign: 'center',
    fontSize: '12px',
    itemMargin: { horizontal: 8, vertical: 4 },
  };

  async ngOnInit(): Promise<void> {
    try {
      const result = await this.usersService.getUserStats();
      this.stats.set(result);
    } finally {
      this.loading.set(false);
    }
  }
}

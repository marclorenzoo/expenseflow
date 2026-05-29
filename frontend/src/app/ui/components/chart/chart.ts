import { Component, input } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import type {
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexOptions,
  ApexPlotOptions,
  ApexResponsive,
  ApexStroke,
  ApexTheme,
  ApexTitleSubtitle,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';

export type { ApexOptions, ApexNonAxisChartSeries };

@Component({
  selector: 'ef-chart',
  imports: [NgApexchartsModule],
  template: `
    <apx-chart
      [series]="series()"
      [colors]="colors()"
      [labels]="labels()"
      [chart]="chart()"
      [xaxis]="xaxis()"
      [yaxis]="yaxis()"
      [stroke]="stroke()"
      [fill]="fill()"
      [dataLabels]="dataLabels()"
      [plotOptions]="plotOptions()"
      [legend]="legend()"
      [grid]="grid()"
      [tooltip]="tooltip()"
      [title]="title()"
      [theme]="theme()"
      [responsive]="responsive()"
    />
  `,
  styles: [':host { display: block; width: 100%; }'],
})
export class Chart {
  series = input<ApexNonAxisChartSeries>([]);
  colors = input<string[]>([]);
  labels = input<string[]>([]);
  chart = input.required<ApexChart>();
  xaxis = input<ApexXAxis>({});
  yaxis = input<ApexYAxis | ApexYAxis[]>({});
  stroke = input<ApexStroke>({});
  fill = input<ApexFill>({});
  dataLabels = input<ApexDataLabels>({ enabled: false });
  plotOptions = input<ApexPlotOptions>({});
  legend = input<ApexLegend>({});
  grid = input<ApexGrid>({});
  tooltip = input<ApexTooltip>({});
  title = input<ApexTitleSubtitle>({});
  theme = input<ApexTheme>({});
  responsive = input<ApexResponsive[]>([]);
}

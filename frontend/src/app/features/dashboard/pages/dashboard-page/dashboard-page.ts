import { Component, inject } from '@angular/core';
import { Card } from '@ui/components/card/card';
import { Button } from '@ui/components/button/button';
import { Input } from '@ui/components/input/input';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [Card, Button, Input],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  private toastService = inject(ToastService);
}

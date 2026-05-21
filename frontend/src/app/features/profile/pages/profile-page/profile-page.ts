import { Component, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService, User } from '@core/services/auth.service';
import { Card } from '@ui/components/card/card';
import { Button } from '@ui/components/button/button';
import { Input } from '@ui/components/input/input';

@Component({
  selector: 'app-profile-page',
  imports: [Card, Button, Input],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  protected readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);

  protected editMode = signal(false);
  protected nameValue = signal('');
  protected saving = signal(false);
  protected saveError = signal('');
  protected saveSuccess = signal(false);

  protected initials = computed(() => {
    const name = this.auth.user()?.name ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  });

  protected enterEditMode() {
    this.nameValue.set(this.auth.user()?.name ?? '');
    this.saveError.set('');
    this.saveSuccess.set(false);
    this.editMode.set(true);
  }

  protected cancelEdit() {
    this.editMode.set(false);
    this.saveError.set('');
  }

  protected async saveProfile() {
    const name = this.nameValue().trim();
    if (!name) return;

    this.saving.set(true);
    this.saveError.set('');

    try {
      const updated = await firstValueFrom(
        this.http.patch<User>('http://localhost:3000/api/users/me', { name }),
      );
      this.auth.updateUser(updated);
      this.saveSuccess.set(true);
      this.editMode.set(false);
    } catch (err: any) {
      this.saveError.set(err.error?.message || 'Error al guardar los cambios');
    } finally {
      this.saving.set(false);
    }
  }
}

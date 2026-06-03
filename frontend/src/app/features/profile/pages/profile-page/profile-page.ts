import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService, User } from '@core/services/auth.service';
import { Card } from '@ui/components/card/card';
import { Button } from '@ui/components/button/button';
import { Input } from '@ui/components/input/input';
import { Skeleton } from '@ui/components/skeleton/skeleton';

@Component({
  selector: 'app-profile-page',
  imports: [NgOptimizedImage, Card, Button, Input, Skeleton],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);

  private readonly API = 'http://localhost:3000/api';

  protected editMode = signal(false);
  protected nameValue = signal('');
  protected saving = signal(false);
  protected saveError = signal('');
  protected saveSuccess = signal(false);

  protected imageUploading = signal(false);
  protected imageDeleting = signal(false);
  protected imageError = signal('');

  protected initials = computed(() => {
    const name = this.auth.user()?.name ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  });

  async ngOnInit() {
    await this.auth.refreshUser();
  }

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
        this.http.patch<User>(`${this.API}/users/me`, { name }),
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

  protected async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.imageUploading.set(true);
    this.imageError.set('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      await firstValueFrom(
        this.http.post<User>(`${this.API}/users/me/image`, formData),
      );
      await this.auth.refreshUser();
    } catch (err: any) {
      this.imageError.set(err.error?.message || 'Error al subir la imagen');
    } finally {
      this.imageUploading.set(false);
      input.value = '';
    }
  }

  protected async deleteImage() {
    this.imageDeleting.set(true);
    this.imageError.set('');
    try {
      await firstValueFrom(
        this.http.delete<User>(`${this.API}/users/me/image`),
      );
      await this.auth.refreshUser();
    } catch (err: any) {
      this.imageError.set(err.error?.message || 'Error al eliminar la imagen');
    } finally {
      this.imageDeleting.set(false);
    }
  }
}

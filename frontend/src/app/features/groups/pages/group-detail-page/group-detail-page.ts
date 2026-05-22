import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupsService, GroupDetail } from '@core/services/groups.service';
import { AuthService } from '@core/services/auth.service';
import { Card } from '@ui/components/card/card';
import { Button } from '@ui/components/button/button';
import { Input } from '@ui/components/input/input';

@Component({
  selector: 'app-group-detail-page',
  imports: [Card, Button, Input],
  templateUrl: './group-detail-page.html',
  styleUrl: './group-detail-page.scss',
})
export class GroupDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly groupsService = inject(GroupsService);
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
      const group = await this.groupsService.getGroup(id);
      this.group.set(group);
    } catch {
      this.loadError.set('No se pudo cargar el grupo');
    } finally {
      this.loading.set(false);
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
}

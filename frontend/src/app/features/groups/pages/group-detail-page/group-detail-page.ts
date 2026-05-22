import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupsService, GroupDetail } from '@core/services/groups.service';
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

  protected memberInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }
}

import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GroupsService, Group } from '@core/services/groups.service';
import { Card } from '@ui/components/card/card';
import { Button } from '@ui/components/button/button';
import { Input } from '@ui/components/input/input';

@Component({
  selector: 'app-groups-page',
  imports: [Card, Button, Input],
  templateUrl: './groups-page.html',
  styleUrl: './groups-page.scss',
})
export class GroupsPage implements OnInit {
  protected readonly groupsService = inject(GroupsService);
  private readonly router = inject(Router);

  protected loading = signal(true);
  protected loadError = signal('');

  protected showCreateModal = signal(false);
  protected creating = signal(false);
  protected createError = signal('');
  protected newName = signal('');
  protected newDescription = signal('');

  async ngOnInit() {
    try {
      await this.groupsService.getGroups();
    } catch {
      this.loadError.set('No se pudieron cargar los grupos');
    } finally {
      this.loading.set(false);
    }
  }

  protected openCreateModal() {
    this.newName.set('');
    this.newDescription.set('');
    this.createError.set('');
    this.showCreateModal.set(true);
  }

  protected closeCreateModal() {
    if (this.creating()) return;
    this.showCreateModal.set(false);
  }

  protected async submitCreate() {
    const name = this.newName().trim();
    if (!name) return;

    this.creating.set(true);
    this.createError.set('');

    try {
      const group = await this.groupsService.createGroup(
        name,
        this.newDescription(),
      );
      this.showCreateModal.set(false);
      this.router.navigate(['/groups', group.id]);
    } catch (err: any) {
      this.createError.set(err.error?.message || 'Error al crear el grupo');
    } finally {
      this.creating.set(false);
    }
  }

  protected navigateToGroup(group: Group) {
    this.router.navigate(['/groups', group.id]);
  }

  protected groupInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }
}

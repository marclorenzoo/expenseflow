import { Injectable, inject, signal, computed } from '@angular/core';
import {
  GroupsService,
  Group,
  GroupDetail,
  CreateGroupData,
  UpdateGroupData,
} from '@core/services/groups.service';
import { AuthService } from '@core/services/auth.service';

export type { Group, GroupDetail };

@Injectable({ providedIn: 'root' })
export class GroupsStore {
  private groupsService = inject(GroupsService);
  private authService = inject(AuthService);

  private _groups = signal<Group[]>([]);
  private _currentGroup = signal<GroupDetail | null>(null);
  private _loading = signal(false);
  private _error = signal('');

  readonly groups = this._groups.asReadonly();
  readonly currentGroup = this._currentGroup.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isAdmin = computed(() => {
    const group = this._currentGroup();
    const userId = this.authService.user()?.id;
    if (!group || !userId) return false;
    return group.members.some(
      (m) => m.user.id === userId && m.role === 'admin',
    );
  });

  async loadGroups(): Promise<void> {
    this._loading.set(true);
    this._error.set('');
    try {
      await this.groupsService.getGroups();
      this._groups.set(this.groupsService.groups());
    } catch {
      this._error.set('No se pudieron cargar los grupos');
    } finally {
      this._loading.set(false);
    }
  }

  async loadGroup(groupId: string): Promise<void> {
    this._loading.set(true);
    this._error.set('');
    try {
      const group = await this.groupsService.getGroup(groupId);
      this._currentGroup.set(group);
    } catch {
      this._error.set('No se pudo cargar el grupo');
    } finally {
      this._loading.set(false);
    }
  }

  async createGroup(data: CreateGroupData): Promise<void> {
    this._loading.set(true);
    this._error.set('');
    try {
      await this.groupsService.createGroup(data.name, data.description);
      this._groups.set(this.groupsService.groups());
    } catch {
      this._error.set('No se pudo crear el grupo');
    } finally {
      this._loading.set(false);
    }
  }

  async updateGroup(groupId: string, data: UpdateGroupData): Promise<void> {
    this._loading.set(true);
    this._error.set('');
    try {
      await this.groupsService.updateGroup(
        groupId,
        data.name,
        data.description,
      );
      this._groups.set(this.groupsService.groups());
      await this.loadGroup(groupId);
    } catch {
      this._error.set('No se pudo actualizar el grupo');
    } finally {
      this._loading.set(false);
    }
  }

  async deleteGroup(groupId: string): Promise<void> {
    this._loading.set(true);
    this._error.set('');
    try {
      await this.groupsService.deleteGroup(groupId);
      this._groups.set(this.groupsService.groups());
      this._currentGroup.set(null);
    } catch {
      this._error.set('No se pudo eliminar el grupo');
    } finally {
      this._loading.set(false);
    }
  }

  async addMember(groupId: string, email: string): Promise<void> {
    this._loading.set(true);
    this._error.set('');
    try {
      await this.groupsService.addMember(groupId, email);
      await this.loadGroup(groupId);
    } catch {
      this._error.set('No se pudo añadir el miembro');
    } finally {
      this._loading.set(false);
    }
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    this._loading.set(true);
    this._error.set('');
    try {
      await this.groupsService.removeMember(groupId, userId);
      await this.loadGroup(groupId);
    } catch {
      this._error.set('No se pudo eliminar el miembro');
    } finally {
      this._loading.set(false);
    }
  }

  async uploadGroupImage(groupId: string, file: File): Promise<void> {
    this._loading.set(true);
    this._error.set('');
    try {
      await this.groupsService.uploadGroupImage(groupId, file);
      await this.loadGroup(groupId);
    } catch {
      this._error.set('No se pudo subir la imagen');
    } finally {
      this._loading.set(false);
    }
  }

  async deleteGroupImage(groupId: string): Promise<void> {
    this._loading.set(true);
    this._error.set('');
    try {
      await this.groupsService.deleteGroupImage(groupId);
      await this.loadGroup(groupId);
    } catch {
      this._error.set('No se pudo eliminar la imagen');
    } finally {
      this._loading.set(false);
    }
  }
}

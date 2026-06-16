import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@environments/environment';

export interface Group {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  role: 'admin' | 'member';
  user: {
    id: string;
    name: string;
    email: string;
    imageUrl?: string;
  };
}

export interface GroupDetail extends Group {
  members: GroupMember[];
}

export interface MemberBalance {
  userId: string;
  name: string;
  paid: number;
  owes: number;
  balance: number;
}

export interface Settlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface GroupBalances {
  total: number;
  balances: MemberBalance[];
  settlements: Settlement[];
}

export interface CreateGroupData {
  name: string;
  description?: string;
}

export interface UpdateGroupData {
  name: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  private _groups = signal<Group[]>([]);
  groups = this._groups.asReadonly();

  async getGroups(): Promise<void> {
    const groups = await firstValueFrom(
      this.http.get<Group[]>(`${this.API}/groups`),
    );
    this._groups.set(groups);
  }

  async createGroup(name: string, description?: string): Promise<Group> {
    const body: { name: string; description?: string } = { name };
    if (description?.trim()) body.description = description.trim();
    const group = await firstValueFrom(
      this.http.post<Group>(`${this.API}/groups`, body),
    );
    this._groups.update((gs) => [...gs, group]);
    return group;
  }

  async getGroup(id: string): Promise<GroupDetail> {
    return firstValueFrom(
      this.http.get<GroupDetail>(`${this.API}/groups/${id}`),
    );
  }

  async updateGroup(
    id: string,
    name: string,
    description?: string,
  ): Promise<Group> {
    const body: { name: string; description?: string } = { name };
    if (description !== undefined) body.description = description;
    const group = await firstValueFrom(
      this.http.patch<Group>(`${this.API}/groups/${id}`, body),
    );
    this._groups.update((gs) => gs.map((g) => (g.id === id ? group : g)));
    return group;
  }

  async deleteGroup(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.API}/groups/${id}`));
    this._groups.update((gs) => gs.filter((g) => g.id !== id));
  }

  async getBalances(groupId: string): Promise<GroupBalances> {
    return firstValueFrom(
      this.http.get<GroupBalances>(`${this.API}/groups/${groupId}/balances`),
    );
  }

  async deleteGroupImage(groupId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.API}/groups/${groupId}/image`),
    );
  }

  async uploadGroupImage(
    groupId: string,
    file: File,
  ): Promise<{ id: string; imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return firstValueFrom(
      this.http.post<{ id: string; imageUrl: string }>(
        `${this.API}/groups/${groupId}/image`,
        formData,
      ),
    );
  }

  async addMember(groupId: string, email: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.API}/groups/${groupId}/members`, { email }),
    );
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.API}/groups/${groupId}/members/${userId}`),
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@environments/environment';

export type ActivityType =
  | 'EXPENSE_CREATED'
  | 'EXPENSE_UPDATED'
  | 'EXPENSE_DELETED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED';

export interface ActivityData {
  expenseId?: string;
  expenseDescription?: string;
  expenseAmount?: number;
  expenseCurrency?: string;
  memberName?: string;
  memberUserId?: string;
}

export interface ActivityActor {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface ActivityLog {
  id: string;
  groupId: string;
  actorUserId: string;
  type: ActivityType;
  data: ActivityData;
  createdAt: string;
  actor: ActivityActor;
}

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  getByGroup(groupId: string): Promise<ActivityLog[]> {
    return firstValueFrom(
      this.http.get<ActivityLog[]>(`${this.API}/groups/${groupId}/activity`),
    );
  }
}

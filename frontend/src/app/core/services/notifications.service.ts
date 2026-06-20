import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';
import { environment } from '@environments/environment';

export type NotificationType =
  | 'EXPENSE_CREATED'
  | 'MEMBER_ADDED'
  | 'GROUP_DELETED';

export interface NotificationData {
  groupId?: string;
  expenseId?: string;
  actorUserId?: string;
  groupName?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData | null;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  getAll(): Promise<Notification[]> {
    return firstValueFrom(
      this.http.get<Notification[]>(`${this.API}/notifications`),
    );
  }

  getUnreadCount(): Promise<number> {
    return firstValueFrom(
      this.http
        .get<{ count: number }>(`${this.API}/notifications/unread-count`)
        .pipe(map((res) => res.count)),
    );
  }

  markAsRead(id: string): Promise<void> {
    return firstValueFrom(
      this.http
        .patch<unknown>(`${this.API}/notifications/${id}/read`, {})
        .pipe(map(() => undefined)),
    );
  }

  markAllAsRead(): Promise<void> {
    return firstValueFrom(
      this.http
        .patch<unknown>(`${this.API}/notifications/read-all`, {})
        .pipe(map(() => undefined)),
    );
  }
}

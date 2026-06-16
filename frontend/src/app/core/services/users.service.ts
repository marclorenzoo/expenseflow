import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@environments/environment';

export interface GroupBalance {
  groupId: string;
  groupName: string;
  balance: number;
}

export interface RecentActivity {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  groupName: string;
}

export interface UserStats {
  totalExpenses: number;
  monthlySpending: number;
  groupBalances: GroupBalance[];
  recentActivity: RecentActivity[];
  categoryBreakdown: { category: string; total: number; percentage: number }[];
  youAreOwed: number;
  youOwe: number;
  activeGroups: number;
  monthlyTrend: { month: number; total: number }[];
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  getUserStats(): Promise<UserStats> {
    return firstValueFrom(
      this.http.get<UserStats>(`${this.API}/users/me/stats`),
    );
  }
}

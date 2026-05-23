import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type Category =
  | 'food'
  | 'transport'
  | 'accommodation'
  | 'entertainment'
  | 'shopping'
  | 'health'
  | 'other';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: Category;
  date: string;
  paidBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateExpenseData {
  description: string;
  amount: number;
  currency?: string;
  category?: Category;
  date?: string;
  paidById: string;
}

export interface UpdateExpenseData {
  description?: string;
  amount?: number;
  currency?: string;
  category?: Category;
  date?: string;
}

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private http = inject(HttpClient);
  private readonly API = 'http://localhost:3000/api';

  getExpensesByGroup(groupId: string): Promise<Expense[]> {
    return firstValueFrom(
      this.http.get<Expense[]>(`${this.API}/groups/${groupId}/expenses`),
    );
  }

  createExpense(groupId: string, data: CreateExpenseData): Promise<Expense> {
    return firstValueFrom(
      this.http.post<Expense>(`${this.API}/groups/${groupId}/expenses`, data),
    );
  }

  updateExpense(id: string, data: UpdateExpenseData): Promise<Expense> {
    return firstValueFrom(
      this.http.patch<Expense>(`${this.API}/expenses/${id}`, data),
    );
  }

  deleteExpense(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.API}/expenses/${id}`));
  }
}

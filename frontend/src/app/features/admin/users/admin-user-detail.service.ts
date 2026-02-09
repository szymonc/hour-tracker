import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface UserDetail {
  id: string;
  email: string;
  name: string;
  role: string;
  phoneNumber: string | null;
  telegramChatId: string | null;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
  circles: Array<{ id: string; name: string }>;
}

export interface UserEntry {
  id: string;
  userId: string;
  circleId: string;
  circleName: string;
  weekStartDate: string;
  hours: number;
  description: string;
  zeroHoursReason: string | null;
  createdAt: string;
  voidedAt: string | null;
  voidedBy: string | null;
  voidedByName: string | null;
  voidReason: string | null;
}

export interface UserEntriesResponse {
  entries: UserEntry[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AdminUserDetailService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getUser(id: string): Observable<UserDetail> {
    return this.http.get<UserDetail>(`${this.apiUrl}/admin/users/${id}/detail`);
  }

  getUserEntries(
    userId: string,
    filters?: { from?: string; to?: string; circleId?: string; page?: number; pageSize?: number },
  ): Observable<UserEntriesResponse> {
    let params = new HttpParams();
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);
    if (filters?.circleId) params = params.set('circleId', filters.circleId);
    if (filters?.page) params = params.set('page', filters.page.toString());
    if (filters?.pageSize) params = params.set('pageSize', filters.pageSize.toString());
    return this.http.get<UserEntriesResponse>(`${this.apiUrl}/admin/users/${userId}/entries`, { params });
  }

  voidEntry(entryId: string, reason: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/admin/entries/${entryId}/void`, { reason });
  }

  createEntryForUser(data: {
    userId: string;
    circleId: string;
    date: string;
    hours: number;
    description: string;
    zeroHoursReason?: string;
  }): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/admin/entries`, data);
  }
}

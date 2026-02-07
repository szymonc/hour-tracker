import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CircleDetail {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
}

export interface CircleMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  joinedAt: string;
  trackingStartDate: string;
}

export interface AvailableUser {
  id: string;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AdminCircleDetailService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getCircle(id: string): Observable<CircleDetail> {
    return this.http.get<CircleDetail>(`${this.apiUrl}/admin/circles/${id}`);
  }

  getMembers(circleId: string): Observable<CircleMember[]> {
    return this.http
      .get<{ members: CircleMember[] }>(`${this.apiUrl}/admin/circles/${circleId}/members`)
      .pipe(map((res) => res.members ?? []));
  }

  getAvailableUsers(circleId: string, search?: string): Observable<AvailableUser[]> {
    let params = new HttpParams();
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http
      .get<{ users: AvailableUser[] }>(`${this.apiUrl}/admin/circles/${circleId}/available-users`, {
        params,
      })
      .pipe(map((res) => res.users ?? []));
  }

  addMember(circleId: string, userId: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/admin/circles/${circleId}/members`, { userId });
  }

  removeMember(circleId: string, userId: string): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/admin/circles/${circleId}/members/${userId}`);
  }

  updateMembership(
    circleId: string,
    userId: string,
    data: { trackingStartDate?: string },
  ): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/admin/circles/${circleId}/members/${userId}`, data);
  }
}

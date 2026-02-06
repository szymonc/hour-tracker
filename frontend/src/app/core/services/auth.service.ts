import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../../store/auth/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/auth/login`,
      { email, password },
      { withCredentials: true }
    );
  }

  register(email: string, password: string, name: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/auth/register`,
      { email, password, name },
      { withCredentials: true }
    );
  }

  googleLogin(): void {
    window.location.href = `${this.apiUrl}/auth/google`;
  }

  processGoogleCallback(token: string): Observable<AuthResponse> {
    // The token is passed as a query param from the callback
    // We fetch the profile with this token and return both user and token
    return this.http.get<User>(`${this.apiUrl}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    }).pipe(
      map((user) => ({
        user,
        accessToken: token,
        expiresIn: 900,
      }))
    );
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`, { withCredentials: true });
  }

  /** Get profile using an explicit token (e.g. from localStorage during session restore). */
  getProfileWithToken(accessToken: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      withCredentials: true,
    });
  }

  updatePhone(phoneNumber: string): Observable<User> {
    return this.http.patch<User>(
      `${this.apiUrl}/me`,
      { phoneNumber },
      { withCredentials: true }
    );
  }

  refreshToken(): Observable<{ accessToken: string }> {
    return this.http.post<{ accessToken: string }>(
      `${this.apiUrl}/auth/refresh`,
      {},
      { withCredentials: true }
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/auth/logout`,
      {},
      { withCredentials: true }
    );
  }
}

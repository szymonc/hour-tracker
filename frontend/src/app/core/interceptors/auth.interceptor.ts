import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, throwError } from 'rxjs';
import { AuthActions } from '../../store/auth/auth.actions';

let isRefreshing = false;

/** Get token synchronously so the interceptor never blocks on store.select() emission. */
function getTokenSync(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const store = inject(Store);

  // Skip auth for public endpoints
  if (req.url.includes('/auth/login') ||
      req.url.includes('/auth/register') ||
      req.url.includes('/auth/google') ||
      req.url.includes('/health')) {
    return next(req);
  }

  // Use localStorage so we never block: store.select(selectAccessToken).pipe(take(1))
  // can emit asynchronously and cause the first request after reload to hang (stuck spinner).
  const token = getTokenSync();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isRefreshing) {
        isRefreshing = true;
        store.dispatch(AuthActions.refreshToken());
        isRefreshing = false;
      }
      return throwError(() => error);
    })
  );
};

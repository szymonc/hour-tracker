import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take, switchMap, of, filter, timeout, catchError, withLatestFrom } from 'rxjs';
import { selectIsAuthenticated, selectUser } from '../../store/auth/auth.selectors';

const RESTORE_WAIT_MS = 5000;

export const guestGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectIsAuthenticated).pipe(
    take(1),
    switchMap((isAuthenticated) => {
      if (isAuthenticated) {
        // Check if admin and redirect accordingly
        return store.select(selectUser).pipe(
          take(1),
          map((user) => {
            if (user?.role === 'admin') {
              router.navigate(['/admin/dashboard']);
            } else {
              router.navigate(['/app/dashboard']);
            }
            return false;
          })
        );
      }
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) {
        return of(true);
      }
      // Token exists: wait for session restore, then redirect if authenticated
      return store.select(selectIsAuthenticated).pipe(
        filter(Boolean),
        take(1),
        timeout(RESTORE_WAIT_MS),
        withLatestFrom(store.select(selectUser)),
        map(([_, user]) => {
          if (user?.role === 'admin') {
            router.navigate(['/admin/dashboard']);
          } else {
            router.navigate(['/app/dashboard']);
          }
          return false;
        }),
        catchError(() => of(true))
      );
    })
  );
};

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take, switchMap, of, filter, timeout, catchError } from 'rxjs';
import { selectIsAuthenticated } from '../../store/auth/auth.selectors';

const RESTORE_WAIT_MS = 5000;

export const authGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectIsAuthenticated).pipe(
    take(1),
    switchMap((isAuthenticated) => {
      if (isAuthenticated) {
        return of(true);
      }
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) {
        router.navigate(['/login']);
        return of(false);
      }
      // Token exists: wait for session restore to complete (isAuthenticated becomes true)
      return store.select(selectIsAuthenticated).pipe(
        filter(Boolean),
        take(1),
        timeout(RESTORE_WAIT_MS),
        map(() => true),
        catchError(() => {
          router.navigate(['/login']);
          return of(false);
        })
      );
    })
  );
};

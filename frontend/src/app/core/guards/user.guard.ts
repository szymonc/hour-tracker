import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';
import { selectIsAdmin } from '../../store/auth/auth.selectors';

/**
 * Guard that blocks admin users from accessing regular user routes.
 * Admins should use the /admin section instead.
 */
export const userGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectIsAdmin).pipe(
    take(1),
    map((isAdmin) => {
      if (isAdmin) {
        // Admins should use the admin section
        router.navigate(['/admin/dashboard']);
        return false;
      }
      return true;
    })
  );
};

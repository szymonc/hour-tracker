import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs';
import { selectRequiresPhoneSetup } from '../../store/auth/auth.selectors';

export const firstTimeGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectRequiresPhoneSetup).pipe(
    take(1),
    map(requiresPhone => {
      if (requiresPhone) {
        router.navigate(['/profile/first-time']);
        return false;
      }

      return true;
    })
  );
};

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs';
import { selectIsPendingApproval } from '../../store/auth/auth.selectors';

export const approvalGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectIsPendingApproval).pipe(
    take(1),
    map(isPending => {
      if (isPending) {
        router.navigate(['/pending-approval']);
        return false;
      }

      return true;
    })
  );
};

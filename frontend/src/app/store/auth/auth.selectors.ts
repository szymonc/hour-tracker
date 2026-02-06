import { createSelector } from '@ngrx/store';
import {
  selectUser,
  selectAccessToken,
  selectIsAuthenticated,
  selectIsLoading,
  selectError,
  selectRequiresPhoneSetup,
} from './auth.reducer';

export {
  selectUser,
  selectAccessToken,
  selectIsAuthenticated,
  selectIsLoading,
  selectError,
  selectRequiresPhoneSetup,
};

export const selectIsAdmin = createSelector(
  selectUser,
  (user) => user?.role === 'admin'
);

export const selectUserName = createSelector(
  selectUser,
  (user) => user?.name ?? ''
);

export const selectUserEmail = createSelector(
  selectUser,
  (user) => user?.email ?? ''
);

export const selectUserPhone = createSelector(
  selectUser,
  (user) => user?.phoneNumber
);

export const selectCanAccessApp = createSelector(
  selectIsAuthenticated,
  selectUser,
  (isAuth, user) => isAuth && user?.phoneNumber !== null
);

export const selectUserRole = createSelector(
  selectUser,
  (user) => user?.role ?? 'user'
);

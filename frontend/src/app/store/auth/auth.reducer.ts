import { createFeature, createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { AuthState } from './auth.models';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  requiresPhoneSetup: false,
};

export const authFeature = createFeature({
  name: 'auth',
  reducer: createReducer(
    initialState,

    // Login
    on(AuthActions.login, AuthActions.register, AuthActions.googleLogin, (state) => ({
      ...state,
      isLoading: true,
      error: null,
    })),

    on(AuthActions.restoreSession, (state) => ({
      ...state,
      isLoading: true,
      error: null,
    })),

    on(
      AuthActions.loginSuccess,
      AuthActions.registerSuccess,
      AuthActions.googleLoginSuccess,
      AuthActions.restoreSessionSuccess,
      (state, { user, accessToken }) => ({
        ...state,
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        requiresPhoneSetup: !user.phoneNumber,
      })
    ),

    on(
      AuthActions.loginFailure,
      AuthActions.registerFailure,
      AuthActions.googleLoginFailure,
      (state, { error }) => ({
        ...state,
        isLoading: false,
        error,
      })
    ),

    // Token refresh
    on(AuthActions.refreshTokenSuccess, (state, { accessToken }) => ({
      ...state,
      accessToken,
    })),

    on(AuthActions.refreshTokenFailure, AuthActions.restoreSessionFailure, () => initialState),

    // Profile
    on(AuthActions.loadProfile, AuthActions.updatePhone, (state) => ({
      ...state,
      isLoading: true,
      error: null,
    })),

    on(
      AuthActions.loadProfileSuccess,
      AuthActions.updatePhoneSuccess,
      (state, { user }) => ({
        ...state,
        user,
        isLoading: false,
        requiresPhoneSetup: !user.phoneNumber,
      })
    ),

    on(AuthActions.loadProfileFailure, AuthActions.updatePhoneFailure, (state, { error }) => ({
      ...state,
      isLoading: false,
      error,
    })),

    // Logout
    on(AuthActions.logoutSuccess, () => initialState),

    // Clear error
    on(AuthActions.clearError, (state) => ({
      ...state,
      error: null,
    }))
  ),
});

export const {
  selectAuthState,
  selectUser,
  selectAccessToken,
  selectIsAuthenticated,
  selectIsLoading,
  selectError,
  selectRequiresPhoneSetup,
} = authFeature;

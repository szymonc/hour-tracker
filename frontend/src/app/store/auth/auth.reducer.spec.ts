import { authFeature, selectUser, selectIsAuthenticated, selectIsLoading, selectError } from './auth.reducer';
import { AuthActions } from './auth.actions';
import { User } from './auth.models';

describe('Auth Reducer', () => {
  const initialState = {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    requiresPhoneSetup: false,
  };

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    authProvider: 'local',
    phoneNumber: '+34612345678',
    telegramChatId: null,
    isActive: true,
    isApproved: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const action = { type: 'Unknown' };
      const state = authFeature.reducer(undefined, action);
      expect(state).toEqual(initialState);
    });
  });

  describe('Login actions', () => {
    it('should set loading true on login', () => {
      const action = AuthActions.login({ email: 'test@example.com', password: 'password' });
      const state = authFeature.reducer(initialState, action);
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set user and token on login success', () => {
      const action = AuthActions.loginSuccess({ user: mockUser, accessToken: 'token123' });
      const state = authFeature.reducer(initialState, action);
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('token123');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set requiresPhoneSetup when user has no phone', () => {
      const userWithoutPhone = { ...mockUser, phoneNumber: null };
      const action = AuthActions.loginSuccess({ user: userWithoutPhone as User, accessToken: 'token123' });
      const state = authFeature.reducer(initialState, action);
      expect(state.requiresPhoneSetup).toBe(true);
    });

    it('should not require phone setup when user has phone', () => {
      const action = AuthActions.loginSuccess({ user: mockUser, accessToken: 'token123' });
      const state = authFeature.reducer(initialState, action);
      expect(state.requiresPhoneSetup).toBe(false);
    });

    it('should set error on login failure', () => {
      const action = AuthActions.loginFailure({ error: 'Invalid credentials' });
      const state = authFeature.reducer(initialState, action);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });
  });

  describe('Register actions', () => {
    it('should set loading true on register', () => {
      const action = AuthActions.register({
        email: 'test@example.com',
        password: 'password',
        name: 'Test',
      });
      const state = authFeature.reducer(initialState, action);
      expect(state.isLoading).toBe(true);
    });

    it('should set user on register success', () => {
      const action = AuthActions.registerSuccess({ user: mockUser, accessToken: 'token123' });
      const state = authFeature.reducer(initialState, action);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should set error on register failure', () => {
      const action = AuthActions.registerFailure({ error: 'Email already exists' });
      const state = authFeature.reducer(initialState, action);
      expect(state.error).toBe('Email already exists');
    });
  });

  describe('Token refresh actions', () => {
    it('should update token on refresh success', () => {
      const authenticatedState = {
        ...initialState,
        user: mockUser,
        accessToken: 'old-token',
        isAuthenticated: true,
      };
      const action = AuthActions.refreshTokenSuccess({ accessToken: 'new-token' });
      const state = authFeature.reducer(authenticatedState, action);
      expect(state.accessToken).toBe('new-token');
      expect(state.user).toEqual(mockUser);
    });

    it('should reset state on refresh failure', () => {
      const authenticatedState = {
        ...initialState,
        user: mockUser,
        accessToken: 'token',
        isAuthenticated: true,
      };
      const action = AuthActions.refreshTokenFailure();
      const state = authFeature.reducer(authenticatedState, action);
      expect(state).toEqual(initialState);
    });
  });

  describe('Profile actions', () => {
    it('should set loading on load profile', () => {
      const action = AuthActions.loadProfile();
      const state = authFeature.reducer(initialState, action);
      expect(state.isLoading).toBe(true);
    });

    it('should update user on load profile success', () => {
      const action = AuthActions.loadProfileSuccess({ user: mockUser });
      const state = authFeature.reducer(initialState, action);
      expect(state.user).toEqual(mockUser);
      expect(state.isLoading).toBe(false);
    });

    it('should set loading on update phone', () => {
      const action = AuthActions.updatePhone({ phoneNumber: '+34612345678' });
      const state = authFeature.reducer(initialState, action);
      expect(state.isLoading).toBe(true);
    });

    it('should update user on update phone success', () => {
      const action = AuthActions.updatePhoneSuccess({ user: mockUser });
      const state = authFeature.reducer(initialState, action);
      expect(state.user).toEqual(mockUser);
      expect(state.requiresPhoneSetup).toBe(false);
    });
  });

  describe('Logout actions', () => {
    it('should reset state on logout success', () => {
      const authenticatedState = {
        ...initialState,
        user: mockUser,
        accessToken: 'token',
        isAuthenticated: true,
      };
      const action = AuthActions.logoutSuccess();
      const state = authFeature.reducer(authenticatedState, action);
      expect(state).toEqual(initialState);
    });
  });

  describe('Clear error action', () => {
    it('should clear error', () => {
      const stateWithError = { ...initialState, error: 'Some error' };
      const action = AuthActions.clearError();
      const state = authFeature.reducer(stateWithError, action);
      expect(state.error).toBeNull();
    });
  });

  describe('Session restore actions', () => {
    it('should set loading on restore session', () => {
      const action = AuthActions.restoreSession();
      const state = authFeature.reducer(initialState, action);
      expect(state.isLoading).toBe(true);
    });

    it('should set user on restore session success', () => {
      const action = AuthActions.restoreSessionSuccess({ user: mockUser, accessToken: 'token' });
      const state = authFeature.reducer(initialState, action);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should reset state on restore session failure', () => {
      const action = AuthActions.restoreSessionFailure();
      const state = authFeature.reducer(initialState, action);
      expect(state).toEqual(initialState);
    });
  });

  describe('Google login actions', () => {
    it('should set loading on google login', () => {
      const action = AuthActions.googleLogin();
      const state = authFeature.reducer(initialState, action);
      expect(state.isLoading).toBe(true);
    });

    it('should set user on google login success', () => {
      const action = AuthActions.googleLoginSuccess({ user: mockUser, accessToken: 'token' });
      const state = authFeature.reducer(initialState, action);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should set error on google login failure', () => {
      const action = AuthActions.googleLoginFailure({ error: 'Google auth failed' });
      const state = authFeature.reducer(initialState, action);
      expect(state.error).toBe('Google auth failed');
    });
  });
});

describe('Auth Selectors', () => {
  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    authProvider: 'local',
    phoneNumber: '+34612345678',
    telegramChatId: null,
    isActive: true,
    isApproved: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const state = {
    auth: {
      user: mockUser,
      accessToken: 'token123',
      isAuthenticated: true,
      isLoading: false,
      error: 'Some error',
      requiresPhoneSetup: false,
    },
  };

  it('should select user', () => {
    expect(selectUser(state)).toEqual(mockUser);
  });

  it('should select isAuthenticated', () => {
    expect(selectIsAuthenticated(state)).toBe(true);
  });

  it('should select isLoading', () => {
    expect(selectIsLoading(state)).toBe(false);
  });

  it('should select error', () => {
    expect(selectError(state)).toBe('Some error');
  });
});

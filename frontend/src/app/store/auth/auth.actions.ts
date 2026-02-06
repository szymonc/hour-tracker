import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { User } from './auth.models';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    // Login
    'Login': props<{ email: string; password: string }>(),
    'Login Success': props<{ user: User; accessToken: string }>(),
    'Login Failure': props<{ error: string }>(),

    // Register
    'Register': props<{ email: string; password: string; name: string }>(),
    'Register Success': props<{ user: User; accessToken: string }>(),
    'Register Failure': props<{ error: string }>(),

    // Google OAuth
    'Google Login': emptyProps(),
    'Google Login Callback': props<{ token: string }>(),
    'Google Login Success': props<{ user: User; accessToken: string }>(),
    'Google Login Failure': props<{ error: string }>(),

    // Token refresh
    'Refresh Token': emptyProps(),
    'Refresh Token Success': props<{ accessToken: string }>(),
    'Refresh Token Failure': emptyProps(),

    // Profile
    'Load Profile': emptyProps(),
    'Load Profile Success': props<{ user: User }>(),
    'Load Profile Failure': props<{ error: string }>(),
    'Update Phone': props<{ phoneNumber: string }>(),
    'Update Phone Success': props<{ user: User }>(),
    'Update Phone Failure': props<{ error: string }>(),

    // Session restore
    'Restore Session': emptyProps(),
    'Restore Session Success': props<{ user: User; accessToken: string }>(),
    'Restore Session Failure': emptyProps(),

    // Logout
    'Logout': emptyProps(),
    'Logout Success': emptyProps(),

    // Clear errors
    'Clear Error': emptyProps(),
  },
});

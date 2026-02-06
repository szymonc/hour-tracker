# NgRx Store Design

## Store Structure Overview

```typescript
interface AppState {
  auth: AuthState;
  circles: CirclesState;
  entries: EntriesState;
  summaries: SummariesState;
  admin: AdminState;
}
```

---

## Auth Feature

### State

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  requiresPhoneSetup: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  phoneNumber: string | null;
  authProvider: 'local' | 'google';
  createdAt: string;
}
```

### Actions

```typescript
// auth.actions.ts
import { createActionGroup, emptyProps, props } from '@ngrx/store';

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
    'Update Phone': props<{ phoneNumber: string }>(),
    'Update Phone Success': props<{ user: User }>(),
    'Update Phone Failure': props<{ error: string }>(),

    // Logout
    'Logout': emptyProps(),
    'Logout Success': emptyProps(),

    // Clear errors
    'Clear Error': emptyProps(),
  },
});
```

### Reducer

```typescript
// auth.reducer.ts
import { createFeature, createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';

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
    on(AuthActions.login, AuthActions.register, AuthActions.googleLogin, (state) => ({
      ...state,
      isLoading: true,
      error: null,
    })),
    on(AuthActions.loginSuccess, AuthActions.registerSuccess, AuthActions.googleLoginSuccess,
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
    on(AuthActions.loginFailure, AuthActions.registerFailure, AuthActions.googleLoginFailure,
      (state, { error }) => ({
        ...state,
        isLoading: false,
        error,
      })
    ),
    on(AuthActions.refreshTokenSuccess, (state, { accessToken }) => ({
      ...state,
      accessToken,
    })),
    on(AuthActions.refreshTokenFailure, AuthActions.logoutSuccess, () => initialState),
    on(AuthActions.loadProfileSuccess, AuthActions.updatePhoneSuccess, (state, { user }) => ({
      ...state,
      user,
      requiresPhoneSetup: !user.phoneNumber,
    })),
    on(AuthActions.clearError, (state) => ({ ...state, error: null })),
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
```

### Selectors

```typescript
// auth.selectors.ts
import { createSelector } from '@ngrx/store';
import { selectUser, selectIsAuthenticated } from './auth.reducer';

export const selectIsAdmin = createSelector(
  selectUser,
  (user) => user?.role === 'admin'
);

export const selectUserName = createSelector(
  selectUser,
  (user) => user?.name ?? ''
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
```

### Effects

```typescript
// auth.effects.ts
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, exhaustMap, catchError, tap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { AuthActions } from './auth.actions';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({ email, password }) =>
        this.authService.login(email, password).pipe(
          map((response) => AuthActions.loginSuccess(response)),
          catchError((error) => of(AuthActions.loginFailure({ error: error.message })))
        )
      )
    )
  );

  loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSuccess, AuthActions.registerSuccess, AuthActions.googleLoginSuccess),
        tap(({ user }) => {
          if (!user.phoneNumber) {
            this.router.navigate(['/profile/first-time']);
          } else {
            this.router.navigate(['/app/dashboard']);
          }
        })
      ),
    { dispatch: false }
  );

  register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.register),
      exhaustMap(({ email, password, name }) =>
        this.authService.register(email, password, name).pipe(
          map((response) => AuthActions.registerSuccess(response)),
          catchError((error) => of(AuthActions.registerFailure({ error: error.message })))
        )
      )
    )
  );

  googleLoginCallback$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.googleLoginCallback),
      exhaustMap(({ token }) =>
        this.authService.processGoogleCallback(token).pipe(
          map((response) => AuthActions.googleLoginSuccess(response)),
          catchError((error) => of(AuthActions.googleLoginFailure({ error: error.message })))
        )
      )
    )
  );

  refreshToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.refreshToken),
      exhaustMap(() =>
        this.authService.refreshToken().pipe(
          map(({ accessToken }) => AuthActions.refreshTokenSuccess({ accessToken })),
          catchError(() => of(AuthActions.refreshTokenFailure()))
        )
      )
    )
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      exhaustMap(() =>
        this.authService.logout().pipe(
          map(() => AuthActions.logoutSuccess()),
          catchError(() => of(AuthActions.logoutSuccess()))
        )
      )
    )
  );

  logoutSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logoutSuccess, AuthActions.refreshTokenFailure),
        tap(() => this.router.navigate(['/login']))
      ),
    { dispatch: false }
  );

  updatePhone$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.updatePhone),
      exhaustMap(({ phoneNumber }) =>
        this.authService.updatePhone(phoneNumber).pipe(
          map((user) => AuthActions.updatePhoneSuccess({ user })),
          catchError((error) => of(AuthActions.updatePhoneFailure({ error: error.message })))
        )
      )
    )
  );

  updatePhoneSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.updatePhoneSuccess),
        tap(() => this.router.navigate(['/app/dashboard']))
      ),
    { dispatch: false }
  );
}
```

---

## Circles Feature

### State

```typescript
interface CirclesState {
  circles: Circle[];
  userMemberships: CircleMembership[];
  isLoading: boolean;
  error: string | null;
}

interface Circle {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface CircleMembership {
  circleId: string;
  circleName: string;
  joinedAt: string;
}
```

### Actions

```typescript
export const CirclesActions = createActionGroup({
  source: 'Circles',
  events: {
    'Load User Circles': emptyProps(),
    'Load User Circles Success': props<{ circles: CircleMembership[] }>(),
    'Load User Circles Failure': props<{ error: string }>(),
  },
});
```

### Reducer with Entity Adapter

```typescript
// circles.reducer.ts
import { createFeature, createReducer, on } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { CirclesActions } from './circles.actions';

export interface CirclesState extends EntityState<CircleMembership> {
  isLoading: boolean;
  error: string | null;
}

export const circlesAdapter: EntityAdapter<CircleMembership> = createEntityAdapter<CircleMembership>({
  selectId: (membership) => membership.circleId,
  sortComparer: (a, b) => a.circleName.localeCompare(b.circleName),
});

const initialState: CirclesState = circlesAdapter.getInitialState({
  isLoading: false,
  error: null,
});

export const circlesFeature = createFeature({
  name: 'circles',
  reducer: createReducer(
    initialState,
    on(CirclesActions.loadUserCircles, (state) => ({
      ...state,
      isLoading: true,
      error: null,
    })),
    on(CirclesActions.loadUserCirclesSuccess, (state, { circles }) =>
      circlesAdapter.setAll(circles, { ...state, isLoading: false })
    ),
    on(CirclesActions.loadUserCirclesFailure, (state, { error }) => ({
      ...state,
      isLoading: false,
      error,
    })),
  ),
  extraSelectors: ({ selectCirclesState }) => ({
    ...circlesAdapter.getSelectors(selectCirclesState),
  }),
});

export const {
  selectAll: selectAllCircles,
  selectEntities: selectCircleEntities,
  selectIds: selectCircleIds,
  selectTotal: selectTotalCircles,
} = circlesFeature;
```

---

## Entries Feature

### State

```typescript
interface EntriesState {
  entries: WeeklyEntry[];
  filters: EntryFilters;
  pagination: Pagination;
  createStatus: 'idle' | 'loading' | 'success' | 'error';
  createError: string | null;
  isLoading: boolean;
  error: string | null;
}

interface WeeklyEntry {
  id: string;
  circleId: string;
  circleName: string;
  weekStartDate: string;
  hours: number;
  description: string;
  zeroHoursReason: string | null;
  createdAt: string;
}

interface EntryFilters {
  from?: string;
  to?: string;
  circleId?: string;
  weekStart?: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
```

### Actions

```typescript
export const EntriesActions = createActionGroup({
  source: 'Entries',
  events: {
    // Load entries
    'Load Entries': props<{ filters?: EntryFilters; page?: number }>(),
    'Load Entries Success': props<{ entries: WeeklyEntry[]; pagination: Pagination }>(),
    'Load Entries Failure': props<{ error: string }>(),

    // Create entry
    'Create Entry': props<{ entry: CreateEntryRequest }>(),
    'Create Entry Success': props<{ entry: WeeklyEntry }>(),
    'Create Entry Failure': props<{ error: string }>(),

    // Update filters
    'Set Filters': props<{ filters: EntryFilters }>(),
    'Clear Filters': emptyProps(),

    // Reset create status
    'Reset Create Status': emptyProps(),
  },
});

interface CreateEntryRequest {
  date: string;
  circleId: string;
  hours: number;
  description: string;
  zeroHoursReason?: string;
}
```

### Reducer with Entity Adapter

```typescript
// entries.reducer.ts
import { createFeature, createReducer, on } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { EntriesActions } from './entries.actions';

export interface EntriesState extends EntityState<WeeklyEntry> {
  filters: EntryFilters;
  pagination: Pagination;
  createStatus: 'idle' | 'loading' | 'success' | 'error';
  createError: string | null;
  isLoading: boolean;
  error: string | null;
}

export const entriesAdapter: EntityAdapter<WeeklyEntry> = createEntityAdapter<WeeklyEntry>({
  selectId: (entry) => entry.id,
  sortComparer: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
});

const initialState: EntriesState = entriesAdapter.getInitialState({
  filters: {},
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
  createStatus: 'idle',
  createError: null,
  isLoading: false,
  error: null,
});

export const entriesFeature = createFeature({
  name: 'entries',
  reducer: createReducer(
    initialState,
    on(EntriesActions.loadEntries, (state) => ({
      ...state,
      isLoading: true,
      error: null,
    })),
    on(EntriesActions.loadEntriesSuccess, (state, { entries, pagination }) =>
      entriesAdapter.setAll(entries, { ...state, isLoading: false, pagination })
    ),
    on(EntriesActions.loadEntriesFailure, (state, { error }) => ({
      ...state,
      isLoading: false,
      error,
    })),
    on(EntriesActions.createEntry, (state) => ({
      ...state,
      createStatus: 'loading' as const,
      createError: null,
    })),
    on(EntriesActions.createEntrySuccess, (state, { entry }) =>
      entriesAdapter.addOne(entry, { ...state, createStatus: 'success' as const })
    ),
    on(EntriesActions.createEntryFailure, (state, { error }) => ({
      ...state,
      createStatus: 'error' as const,
      createError: error,
    })),
    on(EntriesActions.setFilters, (state, { filters }) => ({
      ...state,
      filters,
    })),
    on(EntriesActions.clearFilters, (state) => ({
      ...state,
      filters: {},
    })),
    on(EntriesActions.resetCreateStatus, (state) => ({
      ...state,
      createStatus: 'idle' as const,
      createError: null,
    })),
  ),
  extraSelectors: ({ selectEntriesState }) => ({
    ...entriesAdapter.getSelectors(selectEntriesState),
  }),
});
```

### Selectors

```typescript
// entries.selectors.ts
import { createSelector } from '@ngrx/store';
import { selectAll } from './entries.reducer';

// Group entries by week
export const selectEntriesByWeek = createSelector(
  selectAll,
  (entries) => {
    const byWeek = new Map<string, WeeklyEntry[]>();
    entries.forEach((entry) => {
      const existing = byWeek.get(entry.weekStartDate) ?? [];
      byWeek.set(entry.weekStartDate, [...existing, entry]);
    });
    return byWeek;
  }
);

// Calculate weekly totals
export const selectWeeklyTotals = createSelector(
  selectEntriesByWeek,
  (byWeek) => {
    const totals: WeeklyTotal[] = [];
    byWeek.forEach((entries, weekStartDate) => {
      const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
      const hasZeroReason = entries.some((e) => e.hours === 0 && e.zeroHoursReason);

      let status: WeeklyStatus;
      if (totalHours === 0 && !hasZeroReason) {
        status = 'missing';
      } else if (totalHours === 0 && hasZeroReason) {
        status = 'zero_reason';
      } else if (totalHours < 2) {
        status = 'under_target';
      } else {
        status = 'met';
      }

      totals.push({ weekStartDate, totalHours, entryCount: entries.length, status });
    });
    return totals.sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
  }
);

// Current week status
export const selectCurrentWeekStatus = createSelector(
  selectWeeklyTotals,
  (totals) => {
    const currentWeekStart = getCurrentWeekStart(); // utility function
    return totals.find((t) => t.weekStartDate === currentWeekStart) ?? {
      weekStartDate: currentWeekStart,
      totalHours: 0,
      entryCount: 0,
      status: 'missing' as WeeklyStatus,
    };
  }
);
```

---

## Summaries Feature

### State

```typescript
interface SummariesState {
  weeklySummaries: WeeklySummary[];
  monthlySummary: MonthlySummary | null;
  isLoading: boolean;
  error: string | null;
}

interface WeeklySummary {
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  entryCount: number;
  status: WeeklyStatus;
  byCircle: CircleHours[];
}

interface MonthlySummary {
  month: string;
  totalHours: number;
  weeklyTarget: number;
  weeksInMonth: number;
  expectedHours: number;
  status: WeeklyStatus;
  byCircle: CircleHours[];
  weeklyBreakdown: WeeklyBreakdown[];
}

type WeeklyStatus = 'missing' | 'zero_reason' | 'under_target' | 'met';
```

### Actions

```typescript
export const SummariesActions = createActionGroup({
  source: 'Summaries',
  events: {
    'Load Weekly Summary': props<{ weeks?: number }>(),
    'Load Weekly Summary Success': props<{ summaries: WeeklySummary[]; target: number }>(),
    'Load Weekly Summary Failure': props<{ error: string }>(),

    'Load Monthly Summary': props<{ month?: string }>(),
    'Load Monthly Summary Success': props<{ summary: MonthlySummary }>(),
    'Load Monthly Summary Failure': props<{ error: string }>(),
  },
});
```

### Selectors

```typescript
// summaries.selectors.ts
import { createSelector } from '@ngrx/store';
import { selectSummariesState } from './summaries.reducer';

export const selectLast4Weeks = createSelector(
  selectSummariesState,
  (state) => state.weeklySummaries.slice(0, 4)
);

export const selectLast4WeeksTotal = createSelector(
  selectLast4Weeks,
  (weeks) => weeks.reduce((sum, w) => sum + w.totalHours, 0)
);

export const selectWeeksWithWarnings = createSelector(
  selectLast4Weeks,
  (weeks) => weeks.filter((w) => w.status === 'missing' || w.status === 'under_target')
);

export const selectCurrentMonthProgress = createSelector(
  selectSummariesState,
  (state) => {
    const summary = state.monthlySummary;
    if (!summary) return null;
    return {
      current: summary.totalHours,
      expected: summary.expectedHours,
      percentage: Math.round((summary.totalHours / summary.expectedHours) * 100),
    };
  }
);
```

---

## Admin Feature

### State

```typescript
interface AdminState {
  // Dashboard
  dashboard: AdminDashboard | null;
  dashboardLoading: boolean;

  // Users
  users: EntityState<AdminUser>;
  usersLoading: boolean;
  usersPagination: Pagination;
  usersSearch: string;

  // Circles
  circles: AdminCircle[];
  circlesLoading: boolean;

  // Entries (all users)
  entries: EntityState<AdminEntry>;
  entriesLoading: boolean;
  entriesPagination: Pagination;
  entriesFilters: AdminEntryFilters;

  // Reminders
  reminderTargets: ReminderTarget[];
  remindersLoading: boolean;
  selectedWeek: string;

  // Reports
  reportGenerating: boolean;

  error: string | null;
}

interface AdminDashboard {
  recentEntries: AdminEntry[];
  missingPreviousWeek: MissingUsersReport;
  missingTwoWeeks: MissingUsersReport;
  statusCounts: StatusCounts;
  circleMetrics: CircleMetric[];
}

interface StatusCounts {
  missing: number;
  zeroReason: number;
  underTarget: number;
  met: number;
}
```

### Actions

```typescript
export const AdminActions = createActionGroup({
  source: 'Admin',
  events: {
    // Dashboard
    'Load Dashboard': emptyProps(),
    'Load Dashboard Success': props<{ dashboard: AdminDashboard }>(),
    'Load Dashboard Failure': props<{ error: string }>(),

    // Users
    'Load Users': props<{ search?: string; page?: number }>(),
    'Load Users Success': props<{ users: AdminUser[]; pagination: Pagination }>(),
    'Load Users Failure': props<{ error: string }>(),
    'Update User Phone': props<{ userId: string; phoneNumber: string }>(),
    'Update User Phone Success': props<{ user: AdminUser }>(),
    'Update User Phone Failure': props<{ error: string }>(),

    // Circles
    'Load Circles': emptyProps(),
    'Load Circles Success': props<{ circles: AdminCircle[] }>(),
    'Load Circles Failure': props<{ error: string }>(),

    // Entries
    'Load All Entries': props<{ filters?: AdminEntryFilters; page?: number }>(),
    'Load All Entries Success': props<{ entries: AdminEntry[]; pagination: Pagination }>(),
    'Load All Entries Failure': props<{ error: string }>(),

    // Reminders
    'Load Reminder Targets': props<{ weekStart?: string }>(),
    'Load Reminder Targets Success': props<{ targets: ReminderTarget[]; weekStart: string }>(),
    'Load Reminder Targets Failure': props<{ error: string }>(),

    // Reports
    'Generate CSV Report': props<{ from: string; to: string; circleId?: string; userId?: string }>(),
    'Generate CSV Report Success': emptyProps(),
    'Generate CSV Report Failure': props<{ error: string }>(),
  },
});
```

### Selectors

```typescript
// admin.selectors.ts
import { createSelector } from '@ngrx/store';
import { selectAdminState } from './admin.reducer';

export const selectMissingUsersPrioritized = createSelector(
  selectAdminState,
  (state) => {
    if (!state.dashboard) return [];

    // Combine and prioritize: 2-week missing > 1-week missing > under target
    const twoWeekMissing = state.dashboard.missingTwoWeeks.users.map((u) => ({
      ...u,
      priority: 1,
      label: 'Missing 2+ weeks',
    }));

    const oneWeekMissing = state.dashboard.missingPreviousWeek.users
      .filter((u) => u.status === 'missing')
      .map((u) => ({ ...u, priority: 2, label: 'Missing last week' }));

    const underTarget = state.dashboard.missingPreviousWeek.users
      .filter((u) => u.status === 'under_target')
      .map((u) => ({ ...u, priority: 3, label: 'Under target' }));

    return [...twoWeekMissing, ...oneWeekMissing, ...underTarget];
  }
);

export const selectCircleMetricsSorted = createSelector(
  selectAdminState,
  (state) => {
    if (!state.dashboard) return [];
    return [...state.dashboard.circleMetrics].sort((a, b) => b.totalHours - a.totalHours);
  }
);

export const selectReminderTargetsForExport = createSelector(
  selectAdminState,
  (state) => state.reminderTargets.map((t) => ({
    name: t.userName,
    email: t.userEmail,
    phone: t.phoneNumber ?? 'N/A',
    status: t.status,
    hours: t.totalHours,
  }))
);
```

---

## Store Configuration

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideRouterStore } from '@ngrx/router-store';

import { authFeature } from './store/auth/auth.reducer';
import { circlesFeature } from './store/circles/circles.reducer';
import { entriesFeature } from './store/entries/entries.reducer';
import { summariesFeature } from './store/summaries/summaries.reducer';
import { adminFeature } from './store/admin/admin.reducer';

import { AuthEffects } from './store/auth/auth.effects';
import { CirclesEffects } from './store/circles/circles.effects';
import { EntriesEffects } from './store/entries/entries.effects';
import { SummariesEffects } from './store/summaries/summaries.effects';
import { AdminEffects } from './store/admin/admin.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStore({
      [authFeature.name]: authFeature.reducer,
      [circlesFeature.name]: circlesFeature.reducer,
      [entriesFeature.name]: entriesFeature.reducer,
      [summariesFeature.name]: summariesFeature.reducer,
      [adminFeature.name]: adminFeature.reducer,
    }),
    provideEffects([
      AuthEffects,
      CirclesEffects,
      EntriesEffects,
      SummariesEffects,
      AdminEffects,
    ]),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode(),
      autoPause: true,
      connectInZone: true,
    }),
    provideRouterStore(),
  ],
};
```

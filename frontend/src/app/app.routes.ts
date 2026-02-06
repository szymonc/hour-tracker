import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { userGuard } from './core/guards/user.guard';
import { firstTimeGuard } from './core/guards/first-time.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // Public routes
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./features/auth/callback/callback.component').then(m => m.CallbackComponent),
  },

  // First-time profile setup
  {
    path: 'profile/first-time',
    loadComponent: () => import('./features/auth/first-time-profile/first-time-profile.component').then(m => m.FirstTimeProfileComponent),
    canActivate: [authGuard],
  },

  // Protected user routes (not for admins)
  {
    path: 'app',
    canActivate: [authGuard, firstTimeGuard, userGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'log-hours',
        loadComponent: () => import('./features/log-hours/log-hours.component').then(m => m.LogHoursComponent),
      },
      {
        path: 'history',
        loadComponent: () => import('./features/history/history.component').then(m => m.HistoryComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
      },
    ],
  },

  // Admin routes (with separate shell/layout)
  {
    path: 'admin',
    canActivate: [authGuard, firstTimeGuard, adminGuard],
    loadComponent: () => import('./features/admin/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent),
      },
      {
        path: 'circles',
        loadComponent: () => import('./features/admin/circles/admin-circles.component').then(m => m.AdminCirclesComponent),
      },
      {
        path: 'circles/:id',
        loadComponent: () => import('./features/admin/circles/admin-circle-detail.component').then(m => m.AdminCircleDetailComponent),
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/admin/reports/admin-reports.component').then(m => m.AdminReportsComponent),
      },
      {
        path: 'reminders',
        loadComponent: () => import('./features/admin/reminders/admin-reminders.component').then(m => m.AdminRemindersComponent),
      },
      {
        path: 'backfill',
        loadComponent: () => import('./features/admin/backfill/admin-backfill.component').then(m => m.AdminBackfillComponent),
      },
    ],
  },

  // Wildcard
  {
    path: '**',
    redirectTo: 'login',
  },
];

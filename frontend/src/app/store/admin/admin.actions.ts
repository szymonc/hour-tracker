import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { AdminDashboard } from './admin.reducer';

export const AdminActions = createActionGroup({
  source: 'Admin',
  events: {
    // Dashboard
    'Load Dashboard': emptyProps(),
    'Load Dashboard Success': props<{ dashboard: AdminDashboard }>(),
    'Load Dashboard Failure': props<{ error: string }>(),

    // Users
    'Load Users': props<{ search?: string; page?: number }>(),
    'Load Users Success': props<{ users: any[]; pagination: any }>(),
    'Load Users Failure': props<{ error: string }>(),
    'Update User Phone': props<{ userId: string; phoneNumber: string }>(),
    'Update User Phone Success': props<{ user: any }>(),
    'Update User Phone Failure': props<{ error: string }>(),

    // Circles
    'Load Circles': emptyProps(),
    'Load Circles Success': props<{ circles: any[] }>(),
    'Load Circles Failure': props<{ error: string }>(),
    'Create Circle': props<{ name: string; description?: string }>(),
    'Create Circle Success': emptyProps(),
    'Create Circle Failure': props<{ error: string }>(),
    'Delete Circle': props<{ id: string }>(),
    'Delete Circle Success': emptyProps(),
    'Delete Circle Failure': props<{ error: string }>(),

    // Reminders
    'Load Reminder Targets': props<{ weekStart?: string }>(),
    'Load Reminder Targets Success': props<{ targets: any[]; weekStart: string }>(),
    'Load Reminder Targets Failure': props<{ error: string }>(),

    // Reports
    'Generate CSV Report': props<{ from: string; to: string; circleId?: string; userId?: string }>(),
    'Generate CSV Report Success': emptyProps(),
    'Generate CSV Report Failure': props<{ error: string }>(),

    // Backfill
    'Backfill Entry': props<{
      userId: string;
      circleId: string;
      date: string;
      hours: number;
      description: string;
      zeroHoursReason?: string;
    }>(),
    'Backfill Entry Success': props<{ entry: any }>(),
    'Backfill Entry Failure': props<{ error: string }>(),
    'Reset Backfill Status': emptyProps(),
  },
});

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, exhaustMap, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AdminActions } from './admin.actions';
import { AdminDashboard, PendingUser } from './admin.reducer';

@Injectable()
export class AdminEffects {
  private actions$ = inject(Actions);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);

  loadDashboard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.loadDashboard),
      exhaustMap(() =>
        this.http.get<AdminDashboard | { dashboard?: AdminDashboard }>(`${environment.apiUrl}/admin/dashboard`).pipe(
          map((response) => {
            const dashboard = response && 'dashboard' in response && response.dashboard
              ? response.dashboard
              : (response as AdminDashboard);
            return AdminActions.loadDashboardSuccess({ dashboard });
          }),
          catchError((error) =>
            of(AdminActions.loadDashboardFailure({ error: error.error?.message || 'Failed to load dashboard' }))
          )
        )
      )
    )
  );

  loadPendingUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.loadPendingUsers),
      exhaustMap(() =>
        this.http.get<PendingUser[]>(`${environment.apiUrl}/admin/pending-users`).pipe(
          map((users) => AdminActions.loadPendingUsersSuccess({ users })),
          catchError((error) =>
            of(AdminActions.loadPendingUsersFailure({ error: error.error?.message || 'Failed to load pending users' }))
          )
        )
      )
    )
  );

  approveUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.approveUser),
      exhaustMap(({ userId }) =>
        this.http.post(`${environment.apiUrl}/admin/users/${userId}/approve`, {}).pipe(
          map(() => AdminActions.approveUserSuccess({ userId })),
          catchError((error) =>
            of(AdminActions.approveUserFailure({ error: error.error?.message || 'Failed to approve user' }))
          )
        )
      )
    )
  );

  declineUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.declineUser),
      exhaustMap(({ userId }) =>
        this.http.post(`${environment.apiUrl}/admin/users/${userId}/decline`, {}).pipe(
          map(() => AdminActions.declineUserSuccess({ userId })),
          catchError((error) =>
            of(AdminActions.declineUserFailure({ error: error.error?.message || 'Failed to decline user' }))
          )
        )
      )
    )
  );

  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.loadUsers),
      exhaustMap(({ search, page }) => {
        let params = new HttpParams();
        if (search) params = params.set('search', search);
        if (page) params = params.set('page', page.toString());

        return this.http.get<{ users: any[]; pagination: any }>(`${environment.apiUrl}/admin/users`, { params }).pipe(
          map((response) => AdminActions.loadUsersSuccess({ users: response.users, pagination: response.pagination })),
          catchError((error) =>
            of(AdminActions.loadUsersFailure({ error: error.error?.message || 'Failed to load users' }))
          )
        );
      })
    )
  );

  updateUserPhone$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.updateUserPhone),
      exhaustMap(({ userId, phoneNumber }) =>
        this.http.patch<any>(`${environment.apiUrl}/admin/users/${userId}`, { phoneNumber }).pipe(
          map((user) => AdminActions.updateUserPhoneSuccess({ user })),
          catchError((error) =>
            of(AdminActions.updateUserPhoneFailure({ error: error.error?.message || 'Failed to update phone' }))
          )
        )
      )
    )
  );

  loadCircles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.loadCircles),
      exhaustMap(() =>
        this.http.get<{ circles?: any[] }>(`${environment.apiUrl}/admin/circles`).pipe(
          map((response) => AdminActions.loadCirclesSuccess({ circles: response.circles ?? [] })),
          catchError((error) =>
            of(AdminActions.loadCirclesFailure({ error: error.error?.message || 'Failed to load circles' }))
          )
        )
      )
    )
  );

  createCircle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.createCircle),
      exhaustMap(({ name, description }) =>
        this.http.post<{ id: string }>(`${environment.apiUrl}/admin/circles`, { name, description }).pipe(
          map(() => AdminActions.createCircleSuccess()),
          catchError((error) =>
            of(AdminActions.createCircleFailure({ error: error.error?.message || 'Failed to create circle' }))
          )
        )
      )
    )
  );

  createCircleSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.createCircleSuccess),
      map(() => AdminActions.loadCircles())
    )
  );

  deleteCircle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.deleteCircle),
      exhaustMap(({ id }) =>
        this.http.delete(`${environment.apiUrl}/admin/circles/${id}`).pipe(
          map(() => AdminActions.deleteCircleSuccess()),
          catchError((error) =>
            of(AdminActions.deleteCircleFailure({ error: error.error?.message || 'Failed to remove circle' }))
          )
        )
      )
    )
  );

  deleteCircleSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.deleteCircleSuccess),
      map(() => AdminActions.loadCircles())
    )
  );

  loadReminderTargets$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.loadReminderTargets),
      exhaustMap(({ weekStart }) => {
        let params = new HttpParams();
        if (weekStart) params = params.set('weekStart', weekStart);

        return this.http.get<any>(`${environment.apiUrl}/admin/reminders/weekly`, { params }).pipe(
          map((response) =>
            AdminActions.loadReminderTargetsSuccess({
              targets: response.targets,
              weekStart: response.weekStartDate,
            })
          ),
          catchError((error) =>
            of(AdminActions.loadReminderTargetsFailure({ error: error.error?.message || 'Failed to load reminders' }))
          )
        );
      })
    )
  );

  generateCsvReport$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.generateCSVReport),
      exhaustMap(({ from, to, circleId, userId }) => {
        let params = new HttpParams().set('from', from).set('to', to);
        if (circleId) params = params.set('circleId', circleId);
        if (userId) params = params.set('userId', userId);

        return this.http
          .get(`${environment.apiUrl}/admin/reports/csv`, {
            params,
            responseType: 'blob',
          })
          .pipe(
            tap((blob) => {
              // Trigger download
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `hours-report-${from}-${to}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }),
            map(() => AdminActions.generateCSVReportSuccess()),
            catchError((error) =>
              of(AdminActions.generateCSVReportFailure({ error: error.error?.message || 'Failed to generate report' }))
            )
          );
      })
    )
  );

  backfillEntry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.backfillEntry),
      exhaustMap(({ userId, circleId, date, hours, description, zeroHoursReason }) =>
        this.http
          .post<any>(`${environment.apiUrl}/admin/entries`, {
            userId,
            circleId,
            date,
            hours,
            description,
            zeroHoursReason,
          })
          .pipe(
            map((entry) => AdminActions.backfillEntrySuccess({ entry })),
            catchError((error) =>
              of(AdminActions.backfillEntryFailure({ error: error.error?.message || 'Failed to create entry' }))
            )
          )
      )
    )
  );

  sendTelegramReminder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AdminActions.sendTelegramReminder),
      exhaustMap(({ userId }) =>
        this.http.post<{ success: boolean; sentAt: string }>(`${environment.apiUrl}/admin/users/${userId}/send-telegram-reminder`, {}).pipe(
          map((response) => AdminActions.sendTelegramReminderSuccess({ userId, sentAt: response.sentAt })),
          catchError((error) =>
            of(AdminActions.sendTelegramReminderFailure({ error: error.error?.message || 'Failed to send reminder' }))
          )
        )
      )
    )
  );

  sendTelegramReminderSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AdminActions.sendTelegramReminderSuccess),
        tap(() => {
          this.snackBar.open('Recordatorio enviado por Telegram', 'OK', { duration: 3000 });
        })
      ),
    { dispatch: false }
  );

  sendTelegramReminderFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AdminActions.sendTelegramReminderFailure),
        tap(({ error }) => {
          this.snackBar.open(error || 'Error al enviar recordatorio', 'OK', { duration: 5000 });
        })
      ),
    { dispatch: false }
  );
}

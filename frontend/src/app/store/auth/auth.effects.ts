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
          map((response) =>
            AuthActions.loginSuccess({
              user: response.user,
              accessToken: response.accessToken,
            })
          ),
          catchError((error) =>
            of(AuthActions.loginFailure({ error: error.error?.message || 'Login failed' }))
          )
        )
      )
    )
  );

  register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.register),
      exhaustMap(({ email, password, name }) =>
        this.authService.register(email, password, name).pipe(
          map((response) =>
            AuthActions.registerSuccess({
              user: response.user,
              accessToken: response.accessToken,
            })
          ),
          catchError((error) =>
            of(AuthActions.registerFailure({ error: error.error?.message || 'Registration failed' }))
          )
        )
      )
    )
  );

  googleLoginCallback$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.googleLoginCallback),
      exhaustMap(({ token }) =>
        this.authService.processGoogleCallback(token).pipe(
          map((response) =>
            AuthActions.googleLoginSuccess({
              user: response.user,
              accessToken: response.accessToken,
            })
          ),
          catchError((error) =>
            of(AuthActions.googleLoginFailure({ error: error.error?.message || 'Google login failed' }))
          )
        )
      )
    )
  );

  authSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          AuthActions.loginSuccess,
          AuthActions.registerSuccess,
          AuthActions.googleLoginSuccess
        ),
        tap(({ user, accessToken }) => {
          // Store token
          localStorage.setItem('accessToken', accessToken);

          // Navigate based on profile completion and role
          if (!user.phoneNumber) {
            this.router.navigate(['/profile/first-time']);
          } else if (user.role === 'admin') {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.router.navigate(['/app/dashboard']);
          }
        })
      ),
    { dispatch: false }
  );

  loadProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loadProfile),
      exhaustMap(() =>
        this.authService.getProfile().pipe(
          map((user) => AuthActions.loadProfileSuccess({ user })),
          catchError((error) =>
            of(AuthActions.loadProfileFailure({ error: error.error?.message || 'Failed to load profile' }))
          )
        )
      )
    )
  );

  updatePhone$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.updatePhone),
      exhaustMap(({ phoneNumber }) =>
        this.authService.updatePhone(phoneNumber).pipe(
          map((user) => AuthActions.updatePhoneSuccess({ user })),
          catchError((error) =>
            of(AuthActions.updatePhoneFailure({ error: error.error?.message || 'Failed to update phone' }))
          )
        )
      )
    )
  );

  updatePhoneSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.updatePhoneSuccess),
        tap(() => {
          this.router.navigate(['/app/dashboard']);
        })
      ),
    { dispatch: false }
  );

  refreshToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.refreshToken),
      exhaustMap(() =>
        this.authService.refreshToken().pipe(
          map(({ accessToken }) => {
            localStorage.setItem('accessToken', accessToken);
            return AuthActions.refreshTokenSuccess({ accessToken });
          }),
          catchError(() => of(AuthActions.refreshTokenFailure()))
        )
      )
    )
  );

  restoreSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.restoreSession),
      exhaustMap(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          return of(AuthActions.restoreSessionFailure());
        }

        return this.authService.getProfileWithToken(token).pipe(
          map((user) =>
            AuthActions.restoreSessionSuccess({
              user,
              accessToken: token,
            })
          ),
          catchError(() => of(AuthActions.restoreSessionFailure()))
        );
      })
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
        tap(() => {
          localStorage.removeItem('accessToken');
          this.router.navigate(['/login']);
        })
      ),
    { dispatch: false }
  );

  restoreSessionFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.restoreSessionFailure),
        tap(() => {
          localStorage.removeItem('accessToken');
        })
      ),
    { dispatch: false }
  );
}

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An unexpected error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        message = error.error.message;
      } else {
        // Server-side error
        switch (error.status) {
          case 0:
            message = 'Unable to connect to server. Please check your internet connection.';
            break;
          case 400:
            message = error.error?.message || 'Invalid request';
            break;
          case 401:
            message = 'Session expired. Please login again.';
            break;
          case 403:
            message = 'You do not have permission to perform this action';
            break;
          case 404:
            message = 'Resource not found';
            break;
          case 409:
            message = error.error?.message || 'Conflict error';
            break;
          case 429:
            message = 'Too many requests. Please wait a moment.';
            break;
          case 500:
            message = 'Server error. Please try again later.';
            break;
          default:
            message = error.error?.message || `Error: ${error.status}`;
        }
      }

      // Don't show snackbar for 401 errors (handled by auth interceptor)
      if (error.status !== 401) {
        snackBar.open(message, 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['error-snackbar'],
        });
      }

      return throwError(() => error);
    })
  );
};

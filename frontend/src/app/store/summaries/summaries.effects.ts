import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, exhaustMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SummariesActions } from './summaries.actions';
import { WeeklySummary, MonthlySummary } from './summaries.reducer';

@Injectable()
export class SummariesEffects {
  private actions$ = inject(Actions);
  private http = inject(HttpClient);

  loadWeeklySummary$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SummariesActions.loadWeeklySummary),
      exhaustMap(({ weeks }) => {
        let params = new HttpParams();
        if (weeks) params = params.set('weeks', weeks.toString());

        return this.http
          .get<{ weeks: WeeklySummary[]; target: number; periodTotalHours: number }>(
            `${environment.apiUrl}/me/entries/summary`,
            { params }
          )
          .pipe(
            map((response) =>
              SummariesActions.loadWeeklySummarySuccess({
                summaries: response.weeks,
                target: response.target,
                periodTotalHours: response.periodTotalHours,
              })
            ),
            catchError((error) =>
              of(SummariesActions.loadWeeklySummaryFailure({
                error: error?.error?.message || 'Failed to load summary',
              }))
            )
          );
      })
    )
  );

  loadMonthlySummary$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SummariesActions.loadMonthlySummary),
      exhaustMap(({ month }) => {
        let params = new HttpParams();
        if (month) params = params.set('month', month);

        return this.http
          .get<MonthlySummary>(`${environment.apiUrl}/me/entries/monthly-summary`, { params })
          .pipe(
            map((summary) => SummariesActions.loadMonthlySummarySuccess({ summary })),
            catchError((error) =>
              of(SummariesActions.loadMonthlySummaryFailure({
                error: error?.error?.message || 'Failed to load monthly summary',
              }))
            )
          );
      })
    )
  );
}

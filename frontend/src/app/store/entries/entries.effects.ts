import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, exhaustMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { EntriesActions } from './entries.actions';
import { WeeklyEntry, Pagination } from './entries.reducer';

@Injectable()
export class EntriesEffects {
  private actions$ = inject(Actions);
  private http = inject(HttpClient);

  loadEntries$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EntriesActions.loadEntries),
      exhaustMap(({ filters, page }) => {
        let params = new HttpParams();
        if (filters?.from) params = params.set('from', filters.from);
        if (filters?.to) params = params.set('to', filters.to);
        if (filters?.circleId) params = params.set('circleId', filters.circleId);
        if (filters?.weekStart) params = params.set('weekStart', filters.weekStart);
        if (page) params = params.set('page', page.toString());

        return this.http
          .get<{ entries: WeeklyEntry[]; pagination: Pagination }>(
            `${environment.apiUrl}/me/entries`,
            { params }
          )
          .pipe(
            map((response) =>
              EntriesActions.loadEntriesSuccess({
                entries: response.entries,
                pagination: response.pagination,
              })
            ),
            catchError((error) =>
              of(EntriesActions.loadEntriesFailure({ error: error.error?.message || 'Failed to load entries' }))
            )
          );
      })
    )
  );

  createEntry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EntriesActions.createEntry),
      exhaustMap(({ entry }) =>
        this.http.post<WeeklyEntry>(`${environment.apiUrl}/me/entries`, entry).pipe(
          map((created) => EntriesActions.createEntrySuccess({ entry: created })),
          catchError((error) =>
            of(EntriesActions.createEntryFailure({ error: error.error?.message || 'Failed to create entry' }))
          )
        )
      )
    )
  );
}

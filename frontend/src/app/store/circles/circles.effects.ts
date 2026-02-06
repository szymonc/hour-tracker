import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, exhaustMap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CirclesActions } from './circles.actions';
import { CircleMembership } from './circles.reducer';

/** API returns id/name; we map to circleId/circleName for the store. */
interface MeCirclesApiItem {
  id: string;
  name: string;
  description?: string;
  joinedAt: string;
}

function toCircleMembership(c: MeCirclesApiItem): CircleMembership {
  return {
    circleId: c.id,
    circleName: c.name ?? '',
    description: c.description,
    joinedAt: c.joinedAt,
  };
}

@Injectable()
export class CirclesEffects {
  private actions$ = inject(Actions);
  private http = inject(HttpClient);

  loadUserCircles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CirclesActions.loadUserCircles),
      exhaustMap(() =>
        this.http.get<{ circles: MeCirclesApiItem[] }>(`${environment.apiUrl}/me/circles`).pipe(
            map((response) =>
              CirclesActions.loadUserCirclesSuccess({
                circles: (response.circles ?? []).map(toCircleMembership),
              })
            ),
            catchError((error) =>
              of(CirclesActions.loadUserCirclesFailure({
                error: error?.error?.message || 'Failed to load circles',
              }))
            )
          )
      )
    )
  );
}

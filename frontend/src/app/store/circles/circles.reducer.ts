import { createFeature, createReducer, on } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { CirclesActions } from './circles.actions';

export interface CircleMembership {
  circleId: string;
  circleName: string;
  description?: string;
  joinedAt: string;
}

/** Raw API shape (id/name) or store shape (circleId/circleName). */
type CircleLike = CircleMembership | { id: string; name: string; description?: string; joinedAt: string };

function toCircleMembership(item: CircleLike): CircleMembership {
  return {
    circleId: 'circleId' in item ? item.circleId : item.id,
    circleName: 'circleName' in item ? (item.circleName ?? '') : (item.name ?? ''),
    description: item.description,
    joinedAt: item.joinedAt,
  };
}

export interface CirclesState extends EntityState<CircleMembership> {
  isLoading: boolean;
  error: string | null;
}

export const circlesAdapter: EntityAdapter<CircleMembership> = createEntityAdapter<CircleMembership>({
  selectId: (membership) => membership.circleId,
  sortComparer: (a, b) => (a.circleName ?? '').localeCompare(b.circleName ?? ''),
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
      circlesAdapter.setAll((circles as CircleLike[]).map(toCircleMembership), { ...state, isLoading: false })
    ),
    on(CirclesActions.loadUserCirclesFailure, (state, { error }) => ({
      ...state,
      isLoading: false,
      error,
    }))
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

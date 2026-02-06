import { createFeature, createReducer, on } from '@ngrx/store';
import { EntityState, EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { EntriesActions } from './entries.actions';

export interface WeeklyEntry {
  id: string;
  circleId: string;
  circleName: string;
  weekStartDate: string;
  hours: number;
  description: string;
  zeroHoursReason: string | null;
  createdAt: string;
}

export interface EntryFilters {
  from?: string;
  to?: string;
  circleId?: string;
  weekStart?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

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
    }))
  ),
  extraSelectors: ({ selectEntriesState }) => ({
    ...entriesAdapter.getSelectors(selectEntriesState),
  }),
});

export const {
  selectAll: selectAllEntries,
  selectEntities: selectEntryEntities,
  selectIds: selectEntryIds,
  selectTotal: selectTotalEntries,
} = entriesFeature;

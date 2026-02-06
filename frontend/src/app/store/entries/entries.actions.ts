import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { WeeklyEntry, EntryFilters, Pagination } from './entries.reducer';

export interface CreateEntryRequest {
  date: string;
  circleId: string;
  hours: number;
  description: string;
  zeroHoursReason?: string;
}

export const EntriesActions = createActionGroup({
  source: 'Entries',
  events: {
    // Load entries
    'Load Entries': props<{ filters?: EntryFilters; page?: number }>(),
    'Load Entries Success': props<{ entries: WeeklyEntry[]; pagination: Pagination }>(),
    'Load Entries Failure': props<{ error: string }>(),

    // Create entry
    'Create Entry': props<{ entry: CreateEntryRequest }>(),
    'Create Entry Success': props<{ entry: WeeklyEntry }>(),
    'Create Entry Failure': props<{ error: string }>(),

    // Filters
    'Set Filters': props<{ filters: EntryFilters }>(),
    'Clear Filters': emptyProps(),

    // Reset
    'Reset Create Status': emptyProps(),
  },
});

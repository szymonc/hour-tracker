import { createActionGroup, props } from '@ngrx/store';
import { WeeklySummary, MonthlySummary } from './summaries.reducer';

export const SummariesActions = createActionGroup({
  source: 'Summaries',
  events: {
    'Load Weekly Summary': props<{ weeks?: number }>(),
    'Load Weekly Summary Success': props<{ summaries: WeeklySummary[]; target: number; periodTotalHours: number }>(),
    'Load Weekly Summary Failure': props<{ error: string }>(),

    'Load Monthly Summary': props<{ month?: string }>(),
    'Load Monthly Summary Success': props<{ summary: MonthlySummary }>(),
    'Load Monthly Summary Failure': props<{ error: string }>(),
  },
});

import { createFeature, createReducer, on } from '@ngrx/store';
import { SummariesActions } from './summaries.actions';

export type WeeklyStatus = 'missing' | 'zero_reason' | 'under_target' | 'met';

export interface WeeklySummary {
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  entryCount: number;
  status: WeeklyStatus;
  byCircle: Array<{ circleId: string; circleName: string; hours: number }>;
}

export interface MonthlySummary {
  month: string;
  totalHours: number;
  weeklyTarget: number;
  weeksInMonth: number;
  expectedHours: number;
  status: WeeklyStatus;
  byCircle: Array<{ circleId: string; circleName: string; hours: number }>;
  weeklyBreakdown: Array<{ weekStartDate: string; hours: number; status: WeeklyStatus }>;
}

export interface SummariesState {
  weeklySummaries: WeeklySummary[];
  monthlySummary: MonthlySummary | null;
  target: number;
  periodTotalHours: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: SummariesState = {
  weeklySummaries: [],
  monthlySummary: null,
  target: 2,
  periodTotalHours: 0,
  isLoading: false,
  error: null,
};

export const summariesFeature = createFeature({
  name: 'summaries',
  reducer: createReducer(
    initialState,
    on(SummariesActions.loadWeeklySummary, SummariesActions.loadMonthlySummary, (state) => ({
      ...state,
      isLoading: true,
      error: null,
    })),
    on(SummariesActions.loadWeeklySummarySuccess, (state, { summaries, target, periodTotalHours }) => ({
      ...state,
      weeklySummaries: summaries,
      target,
      periodTotalHours,
      isLoading: false,
    })),
    on(SummariesActions.loadMonthlySummarySuccess, (state, { summary }) => ({
      ...state,
      monthlySummary: summary,
      isLoading: false,
    })),
    on(SummariesActions.loadWeeklySummaryFailure, SummariesActions.loadMonthlySummaryFailure, (state, { error }) => ({
      ...state,
      isLoading: false,
      error,
    }))
  ),
});

export const {
  selectSummariesState,
  selectWeeklySummaries,
  selectMonthlySummary,
  selectTarget,
  selectPeriodTotalHours,
  selectIsLoading,
  selectError,
} = summariesFeature;

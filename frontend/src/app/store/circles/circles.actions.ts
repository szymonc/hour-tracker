import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { CircleMembership } from './circles.reducer';

export const CirclesActions = createActionGroup({
  source: 'Circles',
  events: {
    'Load User Circles': emptyProps(),
    'Load User Circles Success': props<{ circles: CircleMembership[] }>(),
    'Load User Circles Failure': props<{ error: string }>(),
  },
});

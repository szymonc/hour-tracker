import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { LogHoursComponent } from './log-hours.component';

const mockCircles = [
  { circleId: '1', circleName: 'Engineering' },
  { circleId: '2', circleName: 'Design' },
  { circleId: '3', circleName: 'Marketing' },
];

const defaultState = {
  circles: {
    circles: mockCircles,
    isLoading: false,
    error: null,
  },
  entries: {
    ids: [],
    entities: {},
    createStatus: 'idle',
    isLoading: false,
    error: null,
  },
};

const meta: Meta<LogHoursComponent> = {
  title: 'Features/LogHours',
  component: LogHoursComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [
        provideAnimations(),
        provideRouter([]),
      ],
    }),
    moduleMetadata({
      providers: [
        provideMockStore({ initialState: defaultState }),
      ],
    }),
  ],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<LogHoursComponent>;

export const Default: Story = {};

export const Submitting: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        provideMockStore({
          initialState: {
            ...defaultState,
            entries: {
              ids: [],
              entities: {},
              createStatus: 'loading',
              isLoading: false,
              error: null,
            },
          },
        }),
      ],
    }),
  ],
};

export const NoCircles: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        provideMockStore({
          initialState: {
            ...defaultState,
            circles: {
              circles: [],
              isLoading: false,
              error: null,
            },
          },
        }),
      ],
    }),
  ],
};

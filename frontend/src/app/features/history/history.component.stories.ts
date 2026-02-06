import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { provideMockStore } from '@ngrx/store/testing';
import { provideAnimations } from '@angular/platform-browser/animations';

import { HistoryComponent } from './history.component';

const mockEntries = [
  {
    id: '1',
    circleId: '1',
    circleName: 'Engineering',
    weekStartDate: '2024-01-22',
    hours: 3,
    description: 'Implemented new feature for user authentication',
    zeroHoursReason: null,
    createdAt: '2024-01-25T10:00:00Z',
  },
  {
    id: '2',
    circleId: '2',
    circleName: 'Design',
    weekStartDate: '2024-01-15',
    hours: 2,
    description: 'Created wireframes for mobile app redesign',
    zeroHoursReason: null,
    createdAt: '2024-01-18T14:30:00Z',
  },
  {
    id: '3',
    circleId: '1',
    circleName: 'Engineering',
    weekStartDate: '2024-01-08',
    hours: 0,
    description: 'Planned work but had emergency',
    zeroHoursReason: 'Family emergency',
    createdAt: '2024-01-10T09:00:00Z',
  },
];

const defaultState = {
  entries: {
    ids: ['1', '2', '3'],
    entities: {
      '1': mockEntries[0],
      '2': mockEntries[1],
      '3': mockEntries[2],
    },
    filters: {},
    isLoading: false,
    error: null,
    createStatus: 'idle',
    createError: null,
    pagination: {
      page: 1,
      pageSize: 10,
      totalItems: 3,
      totalPages: 1,
    },
  },
};

const meta: Meta<HistoryComponent> = {
  title: 'Features/History',
  component: HistoryComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
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
type Story = StoryObj<HistoryComponent>;

export const Default: Story = {};

export const Loading: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        provideMockStore({
          initialState: {
            entries: {
              ...defaultState.entries,
              ids: [],
              entities: {},
              isLoading: true,
            },
          },
        }),
      ],
    }),
  ],
};

export const Empty: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        provideMockStore({
          initialState: {
            entries: {
              ...defaultState.entries,
              ids: [],
              entities: {},
              isLoading: false,
            },
          },
        }),
      ],
    }),
  ],
};

export const ManyEntries: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        provideMockStore({
          initialState: {
            entries: {
              ...defaultState.entries,
              pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 50,
                totalPages: 5,
              },
            },
          },
        }),
      ],
    }),
  ],
};

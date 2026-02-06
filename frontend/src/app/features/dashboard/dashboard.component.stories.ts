import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { DashboardComponent } from './dashboard.component';

const mockUser = {
  id: '1',
  email: 'john.doe@example.com',
  name: 'John Doe',
  role: 'user',
  authProvider: 'local',
  phoneNumber: '+34612345678',
  isActive: true,
  createdAt: new Date().toISOString(),
};

const mockSummaries = [
  { weekStartDate: '2024-01-22', totalHours: 3, status: 'met' },
  { weekStartDate: '2024-01-15', totalHours: 2, status: 'met' },
  { weekStartDate: '2024-01-08', totalHours: 1.5, status: 'under_target' },
  { weekStartDate: '2024-01-01', totalHours: 0, status: 'zero_reason' },
];

const defaultState = {
  auth: {
    user: mockUser,
    accessToken: 'token',
    isLoading: false,
    error: null,
  },
  summaries: {
    weeklySummaries: mockSummaries,
    isLoading: false,
    error: null,
  },
  circles: {
    circles: [],
    isLoading: false,
    error: null,
  },
};

const meta: Meta<DashboardComponent> = {
  title: 'Features/Dashboard',
  component: DashboardComponent,
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
type Story = StoryObj<DashboardComponent>;

export const Default: Story = {};

export const Loading: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        provideMockStore({
          initialState: {
            ...defaultState,
            summaries: {
              weeklySummaries: [],
              isLoading: true,
              error: null,
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
            ...defaultState,
            summaries: {
              weeklySummaries: [],
              isLoading: false,
              error: null,
            },
          },
        }),
      ],
    }),
  ],
};

export const WithError: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        provideMockStore({
          initialState: {
            ...defaultState,
            summaries: {
              weeklySummaries: [],
              isLoading: false,
              error: 'Failed to load weekly summaries. Please try again.',
            },
          },
        }),
      ],
    }),
  ],
};

import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { provideMockStore } from '@ngrx/store/testing';
import { provideAnimations } from '@angular/platform-browser/animations';

import { ProfileComponent } from './profile.component';

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

const defaultState = {
  auth: {
    user: mockUser,
    accessToken: 'token',
    isLoading: false,
    error: null,
  },
};

const meta: Meta<ProfileComponent> = {
  title: 'Features/Profile',
  component: ProfileComponent,
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
type Story = StoryObj<ProfileComponent>;

export const Default: Story = {};

export const WithoutPhone: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        provideMockStore({
          initialState: {
            auth: {
              user: { ...mockUser, phoneNumber: null },
              accessToken: 'token',
              isLoading: false,
              error: null,
            },
          },
        }),
      ],
    }),
  ],
};

export const AdminUser: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        provideMockStore({
          initialState: {
            auth: {
              user: { ...mockUser, role: 'admin' },
              accessToken: 'token',
              isLoading: false,
              error: null,
            },
          },
        }),
      ],
    }),
  ],
};

export const GoogleUser: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        provideMockStore({
          initialState: {
            auth: {
              user: { ...mockUser, authProvider: 'google' },
              accessToken: 'token',
              isLoading: false,
              error: null,
            },
          },
        }),
      ],
    }),
  ],
};

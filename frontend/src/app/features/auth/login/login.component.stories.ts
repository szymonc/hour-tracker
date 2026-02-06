import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';

import { LoginComponent } from './login.component';

const meta: Meta<LoginComponent> = {
  title: 'Features/Auth/Login',
  component: LoginComponent,
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
        provideMockStore({
          initialState: {
            auth: {
              user: null,
              accessToken: null,
              isLoading: false,
              error: null,
            },
          },
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<LoginComponent>;

export const Default: Story = {};

export const Loading: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        provideMockStore({
          initialState: {
            auth: {
              user: null,
              accessToken: null,
              isLoading: true,
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
            auth: {
              user: null,
              accessToken: null,
              isLoading: false,
              error: 'Invalid email or password. Please try again.',
            },
          },
        }),
      ],
    }),
  ],
};

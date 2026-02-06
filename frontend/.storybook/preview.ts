import type { Preview } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideStore } from '@ngrx/store';
import { provideRouter } from '@angular/router';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f5f5f5' },
        { name: 'dark', value: '#333333' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
  decorators: [
    applicationConfig({
      providers: [
        provideAnimations(),
        provideRouter([]),
        provideStore(),
      ],
    }),
  ],
};

export default preview;

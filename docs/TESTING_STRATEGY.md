# Testing Strategy

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Testing Pyramid                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                          ┌───────────┐                                   │
│                          │  E2E/UI   │  Playwright                       │
│                          │  Tests    │  (Critical paths only)            │
│                         ┌┴───────────┴┐                                  │
│                         │  Visual     │  Storybook + Chromatic           │
│                         │  Regression │  Playwright screenshots          │
│                        ┌┴─────────────┴┐                                 │
│                        │  Integration   │  Supertest (API)               │
│                        │  Tests         │  Testcontainers (DB)           │
│                       ┌┴───────────────┴┐                                │
│                       │   Component      │  @testing-library/angular     │
│                       │   Tests          │  NgRx mock store               │
│                      ┌┴─────────────────┴┐                               │
│                      │    Unit Tests      │  Jest                        │
│                      │    (Services,      │  Isolated functions          │
│                      │    Selectors)      │                              │
│                      └───────────────────┘                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Test Categories & Coverage Targets

| Category | Coverage Target | Tools |
|----------|-----------------|-------|
| Unit Tests | 80%+ | Jest |
| Component Tests | Key components | @testing-library/angular |
| API Integration | All endpoints | Supertest |
| E2E | Critical paths | Playwright |
| Visual | Core components | Storybook + Chromatic |

---

## Frontend Testing

### 1. Unit Tests (Jest + @testing-library/angular)

#### Setup
```typescript
// jest.config.ts
export default {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/*.stories.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '@app/(.*)': '<rootDir>/src/app/$1',
    '@env/(.*)': '<rootDir>/src/environments/$1',
  },
};
```

#### Component Test Examples

**LogHoursForm Component**
```typescript
// log-hours-form.component.spec.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { LogHoursFormComponent } from './log-hours-form.component';
import { EntriesActions } from '@app/store/entries/entries.actions';

describe('LogHoursFormComponent', () => {
  const mockCircles = [
    { circleId: '1', circleName: 'Infrastructure', joinedAt: '2024-01-01' },
    { circleId: '2', circleName: 'General', joinedAt: '2024-01-01' },
  ];

  const initialState = {
    circles: { ids: ['1', '2'], entities: { '1': mockCircles[0], '2': mockCircles[1] } },
    entries: { createStatus: 'idle', createError: null },
  };

  async function setup() {
    const { fixture } = await render(LogHoursFormComponent, {
      providers: [provideMockStore({ initialState })],
    });
    const store = fixture.debugElement.injector.get(MockStore);
    return { fixture, store };
  }

  it('should render form with all required fields', async () => {
    await setup();

    expect(screen.getByLabelText(/week/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/circle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hours/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit|log hours/i })).toBeInTheDocument();
  });

  it('should show circle options from store', async () => {
    await setup();

    const circleSelect = screen.getByLabelText(/circle/i);
    await userEvent.click(circleSelect);

    expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('should require reason field when hours is 0', async () => {
    await setup();

    const hoursInput = screen.getByLabelText(/hours/i);
    await userEvent.clear(hoursInput);
    await userEvent.type(hoursInput, '0');

    // Reason field should appear
    await waitFor(() => {
      expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    });
  });

  it('should not show reason field when hours > 0', async () => {
    await setup();

    const hoursInput = screen.getByLabelText(/hours/i);
    await userEvent.clear(hoursInput);
    await userEvent.type(hoursInput, '1.5');

    expect(screen.queryByLabelText(/reason/i)).not.toBeInTheDocument();
  });

  it('should dispatch CreateEntry action on valid submission', async () => {
    const { store } = await setup();
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    // Fill form
    await userEvent.click(screen.getByLabelText(/circle/i));
    await userEvent.click(screen.getByText('Infrastructure'));

    const hoursInput = screen.getByLabelText(/hours/i);
    await userEvent.clear(hoursInput);
    await userEvent.type(hoursInput, '1.5');

    await userEvent.type(screen.getByLabelText(/description/i), 'Test work description');

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /submit|log hours/i }));

    expect(dispatchSpy).toHaveBeenCalledWith(
      EntriesActions.createEntry({
        entry: expect.objectContaining({
          circleId: '1',
          hours: 1.5,
          description: 'Test work description',
        }),
      })
    );
  });

  it('should validate hours is non-negative', async () => {
    await setup();

    const hoursInput = screen.getByLabelText(/hours/i);
    await userEvent.clear(hoursInput);
    await userEvent.type(hoursInput, '-1');

    await userEvent.click(screen.getByRole('button', { name: /submit|log hours/i }));

    expect(screen.getByText(/must be.*0.*or greater/i)).toBeInTheDocument();
  });

  it('should validate reason is required when hours is 0', async () => {
    await setup();

    const hoursInput = screen.getByLabelText(/hours/i);
    await userEvent.clear(hoursInput);
    await userEvent.type(hoursInput, '0');

    await userEvent.click(screen.getByLabelText(/circle/i));
    await userEvent.click(screen.getByText('Infrastructure'));

    await userEvent.type(screen.getByLabelText(/description/i), 'Test');

    await userEvent.click(screen.getByRole('button', { name: /submit|log hours/i }));

    expect(screen.getByText(/reason.*required/i)).toBeInTheDocument();
  });
});
```

**WeeklyStatusBadge Component**
```typescript
// weekly-status-badge.component.spec.ts
import { render, screen } from '@testing-library/angular';
import { WeeklyStatusBadgeComponent } from './weekly-status-badge.component';

describe('WeeklyStatusBadgeComponent', () => {
  it.each([
    ['missing', /missing/i, 'warn'],
    ['zero_reason', /0h.*reason/i, 'accent'],
    ['under_target', /under/i, 'warn'],
    ['met', /met/i, 'primary'],
  ])('should render %s status correctly', async (status, textPattern, colorClass) => {
    await render(WeeklyStatusBadgeComponent, {
      componentInputs: { status, hours: status === 'met' ? 2.5 : 0.5 },
    });

    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent(textPattern);
    expect(badge).toHaveClass(colorClass);
  });

  it('should show hours when under target', async () => {
    await render(WeeklyStatusBadgeComponent, {
      componentInputs: { status: 'under_target', hours: 1.5 },
    });

    expect(screen.getByText(/1\.5h/)).toBeInTheDocument();
  });
});
```

#### NgRx Selector Tests
```typescript
// entries.selectors.spec.ts
import { selectWeeklyTotals, selectCurrentWeekStatus } from './entries.selectors';

describe('Entries Selectors', () => {
  const mockEntries = [
    { id: '1', weekStartDate: '2024-01-15', hours: 1.5, zeroHoursReason: null },
    { id: '2', weekStartDate: '2024-01-15', hours: 0.5, zeroHoursReason: null },
    { id: '3', weekStartDate: '2024-01-08', hours: 0, zeroHoursReason: 'On vacation' },
  ];

  describe('selectWeeklyTotals', () => {
    it('should group entries by week and calculate totals', () => {
      const state = { entries: { ids: ['1', '2', '3'], entities: toEntities(mockEntries) } };
      const result = selectWeeklyTotals.projector(mockEntries);

      expect(result).toEqual([
        { weekStartDate: '2024-01-15', totalHours: 2.0, entryCount: 2, status: 'met' },
        { weekStartDate: '2024-01-08', totalHours: 0, entryCount: 1, status: 'zero_reason' },
      ]);
    });

    it('should classify status correctly', () => {
      const testCases = [
        { entries: [], expected: 'missing' },
        { entries: [{ hours: 0, zeroHoursReason: null }], expected: 'missing' },
        { entries: [{ hours: 0, zeroHoursReason: 'Valid reason' }], expected: 'zero_reason' },
        { entries: [{ hours: 1.5 }], expected: 'under_target' },
        { entries: [{ hours: 2.0 }], expected: 'met' },
        { entries: [{ hours: 1.0 }, { hours: 1.5 }], expected: 'met' },
      ];

      testCases.forEach(({ entries, expected }) => {
        const result = selectWeeklyTotals.projector(
          entries.map((e, i) => ({ ...e, id: String(i), weekStartDate: '2024-01-15' }))
        );
        expect(result[0]?.status ?? 'missing').toBe(expected);
      });
    });
  });
});
```

#### NgRx Effects Tests
```typescript
// entries.effects.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { EntriesEffects } from './entries.effects';
import { EntriesActions } from './entries.actions';
import { EntriesService } from '@app/core/services/entries.service';

describe('EntriesEffects', () => {
  let actions$: Observable<any>;
  let effects: EntriesEffects;
  let entriesService: jest.Mocked<EntriesService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EntriesEffects,
        provideMockActions(() => actions$),
        {
          provide: EntriesService,
          useValue: {
            createEntry: jest.fn(),
            getEntries: jest.fn(),
          },
        },
      ],
    });

    effects = TestBed.inject(EntriesEffects);
    entriesService = TestBed.inject(EntriesService) as jest.Mocked<EntriesService>;
  });

  describe('createEntry$', () => {
    it('should dispatch CreateEntrySuccess on successful creation', (done) => {
      const entry = { circleId: '1', hours: 1.5, description: 'Work' };
      const createdEntry = { id: '1', ...entry, weekStartDate: '2024-01-15' };

      entriesService.createEntry.mockReturnValue(of(createdEntry));
      actions$ = of(EntriesActions.createEntry({ entry }));

      effects.createEntry$.subscribe((action) => {
        expect(action).toEqual(EntriesActions.createEntrySuccess({ entry: createdEntry }));
        done();
      });
    });

    it('should dispatch CreateEntryFailure on error', (done) => {
      const entry = { circleId: '1', hours: 1.5, description: 'Work' };

      entriesService.createEntry.mockReturnValue(throwError(() => new Error('Network error')));
      actions$ = of(EntriesActions.createEntry({ entry }));

      effects.createEntry$.subscribe((action) => {
        expect(action).toEqual(EntriesActions.createEntryFailure({ error: 'Network error' }));
        done();
      });
    });
  });
});
```

### 2. E2E Tests (Playwright)

#### Setup
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run start:e2e',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Critical Path Tests
```typescript
// e2e/user-flow.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { FirstTimeProfilePage } from './pages/first-time-profile.page';
import { DashboardPage } from './pages/dashboard.page';
import { LogHoursPage } from './pages/log-hours.page';

test.describe('User Flow: Login → Profile → Log Hours', () => {
  test('complete user flow with phone setup', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const profilePage = new FirstTimeProfilePage(page);
    const dashboardPage = new DashboardPage(page);
    const logHoursPage = new LogHoursPage(page);

    // Login
    await loginPage.goto();
    await loginPage.loginWithEmail('testuser@school.org', 'TestPass123!');

    // First-time phone setup
    await expect(page).toHaveURL('/profile/first-time');
    await profilePage.enterPhoneNumber('+34612345678');
    await profilePage.submit();

    // Dashboard
    await expect(page).toHaveURL('/app/dashboard');
    await expect(dashboardPage.welcomeMessage).toBeVisible();

    // Log hours
    await dashboardPage.navigateToLogHours();
    await logHoursPage.selectWeek('current');
    await logHoursPage.selectCircle('Infrastructure');
    await logHoursPage.enterHours('1.5');
    await logHoursPage.enterDescription('Completed networking setup');
    await logHoursPage.submit();

    // Verify success
    await expect(logHoursPage.successMessage).toBeVisible();

    // Return to dashboard and verify
    await dashboardPage.goto();
    await expect(dashboardPage.currentWeekTotal).toContainText('1.5');
  });

  test('log 0 hours requires reason', async ({ page }) => {
    const logHoursPage = new LogHoursPage(page);

    await test.step('Login as existing user', async () => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'existinguser@school.org');
      await page.fill('[data-testid="password-input"]', 'TestPass123!');
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL('/app/dashboard');
    });

    await test.step('Navigate to log hours', async () => {
      await logHoursPage.goto();
    });

    await test.step('Fill form with 0 hours', async () => {
      await logHoursPage.selectWeek('current');
      await logHoursPage.selectCircle('General');
      await logHoursPage.enterHours('0');
      await logHoursPage.enterDescription('No work this week');
    });

    await test.step('Verify reason field appears', async () => {
      await expect(logHoursPage.reasonField).toBeVisible();
    });

    await test.step('Submit without reason should fail', async () => {
      await logHoursPage.submit();
      await expect(logHoursPage.reasonError).toBeVisible();
    });

    await test.step('Submit with reason should succeed', async () => {
      await logHoursPage.enterReason('On vacation this week');
      await logHoursPage.submit();
      await expect(logHoursPage.successMessage).toBeVisible();
    });
  });
});

// e2e/admin-flow.spec.ts
test.describe('Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@school.org');
    await page.fill('[data-testid="password-input"]', 'AdminPass123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/app/dashboard');
  });

  test('view missing hours lists', async ({ page }) => {
    await page.goto('/admin/dashboard');

    // Verify missing users sections
    await expect(page.getByTestId('missing-1-week')).toBeVisible();
    await expect(page.getByTestId('missing-2-weeks')).toBeVisible();

    // Verify priority ordering (2-week missing first)
    const prioritizedList = page.getByTestId('prioritized-missing-list');
    const firstItem = prioritizedList.locator('li').first();
    await expect(firstItem).toContainText(/2.*week/i);
  });

  test('CSV export downloads file with correct columns', async ({ page }) => {
    await page.goto('/admin/reports');

    // Set date range
    await page.fill('[data-testid="from-date"]', '2024-01-01');
    await page.fill('[data-testid="to-date"]', '2024-01-31');

    // Download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-csv"]');
    const download = await downloadPromise;

    // Verify filename
    expect(download.suggestedFilename()).toMatch(/hours-report-.*\.csv/);

    // Verify content (read first line)
    const path = await download.path();
    const content = await fs.readFile(path!, 'utf-8');
    const headers = content.split('\n')[0];

    expect(headers).toContain('User ID');
    expect(headers).toContain('User Name');
    expect(headers).toContain('Circle');
    expect(headers).toContain('Week Start');
    expect(headers).toContain('Hours');
  });
});
```

### 3. Storybook + Visual Regression

#### Storybook Setup
```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|mdx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-viewport',
  ],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
  staticDirs: ['../src/assets'],
};

export default config;
```

#### Component Stories
```typescript
// weekly-status-badge.stories.ts
import type { Meta, StoryObj } from '@storybook/angular';
import { WeeklyStatusBadgeComponent } from './weekly-status-badge.component';

const meta: Meta<WeeklyStatusBadgeComponent> = {
  title: 'Components/WeeklyStatusBadge',
  component: WeeklyStatusBadgeComponent,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['missing', 'zero_reason', 'under_target', 'met'],
    },
    hours: { control: { type: 'number', min: 0, max: 10, step: 0.5 } },
  },
};

export default meta;
type Story = StoryObj<WeeklyStatusBadgeComponent>;

export const Missing: Story = {
  args: { status: 'missing', hours: 0 },
};

export const ZeroWithReason: Story = {
  args: { status: 'zero_reason', hours: 0 },
};

export const UnderTarget: Story = {
  args: { status: 'under_target', hours: 1.5 },
};

export const Met: Story = {
  args: { status: 'met', hours: 2.5 },
};

export const AllStates: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        <app-weekly-status-badge status="missing" [hours]="0" />
        <app-weekly-status-badge status="zero_reason" [hours]="0" />
        <app-weekly-status-badge status="under_target" [hours]="1.5" />
        <app-weekly-status-badge status="met" [hours]="2.5" />
      </div>
    `,
  }),
};

// log-hours-form.stories.ts
import type { Meta, StoryObj } from '@storybook/angular';
import { provideMockStore } from '@ngrx/store/testing';
import { LogHoursFormComponent } from './log-hours-form.component';

const meta: Meta<LogHoursFormComponent> = {
  title: 'Forms/LogHoursForm',
  component: LogHoursFormComponent,
  decorators: [
    moduleMetadata({
      providers: [
        provideMockStore({
          initialState: {
            circles: {
              ids: ['1', '2'],
              entities: {
                '1': { circleId: '1', circleName: 'Infrastructure' },
                '2': { circleId: '2', circleName: 'General' },
              },
            },
            entries: { createStatus: 'idle' },
          },
        }),
      ],
    }),
  ],
};

export default meta;
type Story = StoryObj<LogHoursFormComponent>;

export const Default: Story = {};

export const Loading: Story = {
  decorators: [
    moduleMetadata({
      providers: [
        provideMockStore({
          initialState: {
            circles: { ids: ['1'], entities: { '1': { circleId: '1', circleName: 'Infrastructure' } } },
            entries: { createStatus: 'loading' },
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
            circles: { ids: ['1'], entities: { '1': { circleId: '1', circleName: 'Infrastructure' } } },
            entries: { createStatus: 'error', createError: 'Failed to create entry' },
          },
        }),
      ],
    }),
  ],
};
```

#### Visual Regression with Chromatic
```yaml
# .github/workflows/chromatic.yml
name: Chromatic

on:
  push:
    branches: [main]
  pull_request:

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Run Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          workingDir: frontend
          buildScriptName: build-storybook
```

#### Playwright Visual Tests
```typescript
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `,
    });

    // Mock date for consistent "last 4 weeks"
    await page.addInitScript(() => {
      const fixedDate = new Date('2024-01-20T12:00:00Z');
      Date.now = () => fixedDate.getTime();
    });
  });

  test('dashboard page', async ({ page }) => {
    await page.goto('/app/dashboard');
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="user-avatar"]')],
    });
  });

  test('log hours form', async ({ page }) => {
    await page.goto('/app/log-hours');
    await expect(page).toHaveScreenshot('log-hours-form.png');
  });

  test('admin dashboard', async ({ page }) => {
    // Login as admin first
    await page.goto('/admin/dashboard');
    await expect(page).toHaveScreenshot('admin-dashboard.png', {
      fullPage: true,
    });
  });

  test('responsive: mobile dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/app/dashboard');
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
    });
  });
});
```

---

## Backend Testing

### 1. Unit Tests (Jest + @nestjs/testing)

```typescript
// entries.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntriesService } from './entries.service';
import { WeeklyEntry } from './entities/weekly-entry.entity';
import { DateUtils } from '../common/utils/date.utils';

describe('EntriesService', () => {
  let service: EntriesService;
  let repository: MockRepository<WeeklyEntry>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntriesService,
        {
          provide: getRepositoryToken(WeeklyEntry),
          useValue: createMockRepository(),
        },
        {
          provide: DateUtils,
          useValue: {
            getWeekStartDate: jest.fn((date) => {
              // Return Monday of the week
              const d = new Date(date);
              const day = d.getDay();
              const diff = d.getDate() - day + (day === 0 ? -6 : 1);
              return new Date(d.setDate(diff)).toISOString().split('T')[0];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EntriesService>(EntriesService);
    repository = module.get(getRepositoryToken(WeeklyEntry));
  });

  describe('createEntry', () => {
    it('should compute weekStartDate server-side', async () => {
      const dto = {
        date: '2024-01-17', // Wednesday
        circleId: 'circle-1',
        hours: 1.5,
        description: 'Work done',
      };

      repository.save.mockResolvedValue({
        id: 'entry-1',
        ...dto,
        weekStartDate: '2024-01-15', // Monday
      });

      const result = await service.createEntry('user-1', dto);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          weekStartDate: '2024-01-15',
        })
      );
    });

    it('should require zeroHoursReason when hours is 0', async () => {
      const dto = {
        date: '2024-01-17',
        circleId: 'circle-1',
        hours: 0,
        description: 'No work',
        // zeroHoursReason missing
      };

      await expect(service.createEntry('user-1', dto)).rejects.toThrow(
        /reason.*required/i
      );
    });

    it('should accept hours = 0 with valid reason', async () => {
      const dto = {
        date: '2024-01-17',
        circleId: 'circle-1',
        hours: 0,
        description: 'No work',
        zeroHoursReason: 'On vacation',
      };

      repository.save.mockResolvedValue({ id: 'entry-1', ...dto });

      await expect(service.createEntry('user-1', dto)).resolves.toBeDefined();
    });
  });

  describe('getWeeklyStatus', () => {
    it('should return MISSING when no entries', async () => {
      repository.find.mockResolvedValue([]);

      const status = await service.getWeeklyStatus('user-1', '2024-01-15');

      expect(status).toBe('missing');
    });

    it('should return ZERO_REASON when total is 0 with reason', async () => {
      repository.find.mockResolvedValue([
        { hours: 0, zeroHoursReason: 'Sick leave' },
      ]);

      const status = await service.getWeeklyStatus('user-1', '2024-01-15');

      expect(status).toBe('zero_reason');
    });

    it('should return UNDER_TARGET when 0 < total < 2', async () => {
      repository.find.mockResolvedValue([
        { hours: 1.5, zeroHoursReason: null },
      ]);

      const status = await service.getWeeklyStatus('user-1', '2024-01-15');

      expect(status).toBe('under_target');
    });

    it('should return MET when total >= 2', async () => {
      repository.find.mockResolvedValue([
        { hours: 1.0, zeroHoursReason: null },
        { hours: 1.5, zeroHoursReason: null },
      ]);

      const status = await service.getWeeklyStatus('user-1', '2024-01-15');

      expect(status).toBe('met');
    });
  });
});
```

### 2. API Integration Tests (Supertest)

```typescript
// test/entries.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('EntriesController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    dataSource = app.get(DataSource);

    // Seed test data and get auth token
    await seedTestData(dataSource);
    authToken = await getTestAuthToken(app);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('POST /me/entries', () => {
    it('should create entry successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/me/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: '2024-01-17',
          circleId: 'test-circle-id',
          hours: 1.5,
          description: 'Test entry',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toMatchObject({
            weekStartDate: '2024-01-15',
            hours: 1.5,
            description: 'Test entry',
          });
          expect(res.body.id).toBeDefined();
        });
    });

    it('should reject entry without circle membership', () => {
      return request(app.getHttpServer())
        .post('/api/v1/me/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: '2024-01-17',
          circleId: 'non-member-circle-id',
          hours: 1.5,
          description: 'Test entry',
        })
        .expect(403);
    });

    it('should reject 0 hours without reason', () => {
      return request(app.getHttpServer())
        .post('/api/v1/me/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: '2024-01-17',
          circleId: 'test-circle-id',
          hours: 0,
          description: 'No work',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('reason');
        });
    });

    it('should accept 0 hours with reason', () => {
      return request(app.getHttpServer())
        .post('/api/v1/me/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: '2024-01-17',
          circleId: 'test-circle-id',
          hours: 0,
          description: 'No work this week',
          zeroHoursReason: 'On vacation',
        })
        .expect(201);
    });
  });

  describe('GET /me/summary', () => {
    it('should return weekly summaries with correct status', async () => {
      // Create entries for multiple weeks
      await createTestEntries(app, authToken);

      return request(app.getHttpServer())
        .get('/api/v1/me/summary?weeks=4')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.weeks).toHaveLength(4);
          expect(res.body.weeks[0]).toMatchObject({
            weekStartDate: expect.any(String),
            totalHours: expect.any(Number),
            status: expect.stringMatching(/missing|zero_reason|under_target|met/),
          });
        });
    });
  });
});
```

### 3. Database Integration Tests (Testcontainers)

```typescript
// test/database.integration-spec.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { EntriesService } from '../src/entries/entries.service';

describe('Database Integration', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let entriesService: EntriesService;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:15')
      .withDatabase('testdb')
      .start();

    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      entities: ['src/**/*.entity.ts'],
      synchronize: true,
    });

    await dataSource.initialize();
    // Initialize service with real repository
  }, 60000);

  afterAll(async () => {
    await dataSource.destroy();
    await container.stop();
  });

  describe('Weekly Totals Computation', () => {
    it('should correctly aggregate entries across circles', async () => {
      // Seed data
      const userId = await createUser(dataSource);
      const circleIds = await createCircles(dataSource, 2);

      await dataSource.query(`
        INSERT INTO weekly_entries (user_id, circle_id, week_start_date, hours, description)
        VALUES
          ($1, $2, '2024-01-15', 1.0, 'Work 1'),
          ($1, $3, '2024-01-15', 1.5, 'Work 2')
      `, [userId, circleIds[0], circleIds[1]]);

      // Test via view
      const result = await dataSource.query(`
        SELECT * FROM vw_weekly_user_totals
        WHERE user_id = $1 AND week_start_date = '2024-01-15'
      `, [userId]);

      expect(result[0].total_hours).toBe('2.50');
      expect(result[0].status).toBe('met');
    });
  });

  describe('Missing Users Function', () => {
    it('should return users with missing hours', async () => {
      // Seed users and entries
      const users = await createUsers(dataSource, 3);

      // User 1: met target
      await createEntry(dataSource, users[0], '2024-01-15', 2.0);

      // User 2: under target
      await createEntry(dataSource, users[1], '2024-01-15', 1.0);

      // User 3: missing (no entries)

      const result = await dataSource.query(`
        SELECT * FROM get_missing_users('2024-01-15')
      `);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('missing');
      expect(result[1].status).toBe('under_target');
    });
  });
});
```

---

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Run unit tests
        run: npm run test:ci
        working-directory: frontend

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          directory: frontend/coverage

  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: backend

      - name: Run unit tests
        run: npm run test
        working-directory: backend

      - name: Run e2e tests
        run: npm run test:e2e
        working-directory: backend
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [frontend-tests, backend-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps
        working-directory: frontend

      - name: Start services
        run: docker compose -f docker-compose.test.yml up -d

      - name: Wait for services
        run: npx wait-on http://localhost:4200 http://localhost:3000/health

      - name: Run Playwright tests
        run: npm run test:e2e
        working-directory: frontend

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report
```

---

## Visual Testing Stability Requirements

1. **Disable animations:**
   ```css
   /* test-mode.css - loaded during tests */
   *, *::before, *::after {
     animation-duration: 0s !important;
     animation-delay: 0s !important;
     transition-duration: 0s !important;
     transition-delay: 0s !important;
   }
   ```

2. **Mock dates:**
   ```typescript
   // test/setup.ts
   beforeEach(() => {
     jest.useFakeTimers();
     jest.setSystemTime(new Date('2024-01-20T12:00:00Z'));
   });
   ```

3. **Deterministic test data:**
   ```typescript
   // test/fixtures/seed.ts
   export const seedData = {
     users: [
       { id: 'user-1', name: 'Test User 1', email: 'test1@school.org' },
       // ...
     ],
     // Consistent IDs, timestamps, etc.
   };
   ```

4. **Bundled fonts:**
   ```scss
   // Include font files in project instead of external CDN
   @font-face {
     font-family: 'Roboto';
     src: url('/assets/fonts/Roboto-Regular.woff2') format('woff2');
   }
   ```

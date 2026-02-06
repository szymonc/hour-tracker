import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { DashboardComponent } from './dashboard.component';
import { SummariesActions } from '../../store/summaries/summaries.actions';
import { CirclesActions } from '../../store/circles/circles.actions';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let store: MockStore;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockSummaries = [
    { weekStartDate: '2024-01-08', totalHours: 3, status: 'met' },
    { weekStartDate: '2024-01-01', totalHours: 1, status: 'under_target' },
    { weekStartDate: '2023-12-25', totalHours: 0, status: 'zero_reason' },
    { weekStartDate: '2023-12-18', totalHours: 0, status: 'missing' },
  ];

  const initialState = {
    auth: {
      user: mockUser,
      accessToken: 'token',
      isLoading: false,
      error: null,
    },
    summaries: {
      weeklySummaries: [],
      isLoading: false,
      error: null,
    },
    circles: {
      circles: [],
      isLoading: false,
      error: null,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        provideMockStore({ initialState }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    jest.spyOn(store, 'dispatch');

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component initialization', () => {
    it('should create', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should dispatch load actions on init', () => {
      fixture.detectChanges();

      expect(store.dispatch).toHaveBeenCalledWith(
        SummariesActions.loadWeeklySummary({ weeks: 4 })
      );
      expect(store.dispatch).toHaveBeenCalledWith(CirclesActions.loadUserCircles());
    });

    it('should display user first name in welcome message', () => {
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector('h1');
      expect(header.textContent).toContain('Test');
    });
  });

  describe('Weekly summaries display', () => {
    it('should display weekly summaries when loaded', () => {
      store.setState({
        ...initialState,
        summaries: {
          weeklySummaries: mockSummaries,
          isLoading: false,
          error: null,
        },
      });
      fixture.detectChanges();

      const weekRows = fixture.nativeElement.querySelectorAll('.week-row');
      expect(weekRows.length).toBe(4);
    });

    it('should show empty message when no summaries', () => {
      store.setState({
        ...initialState,
        summaries: {
          weeklySummaries: [],
          isLoading: false,
          error: null,
        },
      });
      fixture.detectChanges();

      const emptyMessage = fixture.nativeElement.querySelector('.empty-message');
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage.textContent).toContain('No entries logged yet');
    });

    it('should show loading spinner when loading', () => {
      store.setState({
        ...initialState,
        summaries: {
          weeklySummaries: [],
          isLoading: true,
          error: null,
        },
      });
      fixture.detectChanges();

      const spinners = fixture.nativeElement.querySelectorAll('mat-spinner');
      expect(spinners.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should display error message when error occurs', () => {
      store.setState({
        ...initialState,
        summaries: {
          weeklySummaries: [],
          isLoading: false,
          error: 'Failed to load data',
        },
      });
      fixture.detectChanges();

      const errorMessage = fixture.nativeElement.querySelector('.error-message');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.textContent).toContain('Failed to load data');
    });

    it('should show retry button on error', () => {
      store.setState({
        ...initialState,
        summaries: {
          weeklySummaries: [],
          isLoading: false,
          error: 'Failed to load data',
        },
      });
      fixture.detectChanges();

      const retryButton = fixture.nativeElement.querySelector('.error-container button');
      expect(retryButton).toBeTruthy();
    });

    it('should dispatch load actions on retry', () => {
      store.setState({
        ...initialState,
        summaries: {
          weeklySummaries: [],
          isLoading: false,
          error: 'Failed to load data',
        },
      });
      fixture.detectChanges();
      (store.dispatch as jest.Mock).mockClear();

      component.retry();

      expect(store.dispatch).toHaveBeenCalledWith(
        SummariesActions.loadWeeklySummary({ weeks: 4 })
      );
      expect(store.dispatch).toHaveBeenCalledWith(CirclesActions.loadUserCircles());
    });
  });

  describe('Status formatting', () => {
    it('should format status correctly', () => {
      expect(component.formatStatus('met')).toBe('Met');
      expect(component.formatStatus('under_target')).toBe('Under');
      expect(component.formatStatus('zero_reason')).toBe('0h Reason');
      expect(component.formatStatus('missing')).toBe('Missing');
      expect(component.formatStatus('unknown')).toBe('unknown');
    });
  });

  describe('Week formatting', () => {
    it('should format week dates correctly', () => {
      const formatted = component.formatWeek('2024-01-08');
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('8');
    });
  });

  describe('Quick actions', () => {
    it('should have Log Hours button', () => {
      fixture.detectChanges();
      const logHoursButton = fixture.nativeElement.querySelector(
        'button[routerLink="/app/log-hours"]'
      );
      expect(logHoursButton).toBeTruthy();
    });

    it('should have View History button', () => {
      fixture.detectChanges();
      const historyButton = fixture.nativeElement.querySelector(
        'button[routerLink="/app/history"]'
      );
      expect(historyButton).toBeTruthy();
    });

    it('should have Edit Profile button', () => {
      fixture.detectChanges();
      const profileButton = fixture.nativeElement.querySelector(
        'button[routerLink="/app/profile"]'
      );
      expect(profileButton).toBeTruthy();
    });
  });

  describe('Header actions', () => {
    it('should have Log Hours button in header', () => {
      fixture.detectChanges();
      const headerLogButton = fixture.nativeElement.querySelector(
        '.dashboard-header button[routerLink="/app/log-hours"]'
      );
      expect(headerLogButton).toBeTruthy();
    });
  });
});

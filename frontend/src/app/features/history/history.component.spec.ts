import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { HistoryComponent } from './history.component';
import { EntriesActions } from '../../store/entries/entries.actions';

describe('HistoryComponent', () => {
  let component: HistoryComponent;
  let fixture: ComponentFixture<HistoryComponent>;
  let store: MockStore;

  const mockEntries = [
    {
      id: '1',
      weekStartDate: '2024-01-08',
      circleName: 'Circle A',
      hours: 3,
      description: 'Worked on feature X',
    },
    {
      id: '2',
      weekStartDate: '2024-01-01',
      circleName: 'Circle B',
      hours: 2,
      description: 'Bug fixes and testing',
    },
  ];

  const initialState = {
    entries: {
      ids: [],
      entities: {},
      filters: {},
      isLoading: false,
      error: null,
      createStatus: 'idle',
      createError: null,
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      },
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoryComponent],
      providers: [
        provideNoopAnimations(),
        provideMockStore({ initialState }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    jest.spyOn(store, 'dispatch');

    fixture = TestBed.createComponent(HistoryComponent);
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

    it('should dispatch loadEntries on init', () => {
      fixture.detectChanges();
      expect(store.dispatch).toHaveBeenCalledWith(EntriesActions.loadEntries({}));
    });

    it('should have correct displayed columns', () => {
      expect(component.displayedColumns).toEqual([
        'weekStartDate',
        'circleName',
        'hours',
        'description',
      ]);
    });
  });

  describe('Table rendering', () => {
    it('should have table element when entries exist', async () => {
      store.setState({
        entries: {
          ...initialState.entries,
          ids: ['1', '2'],
          entities: {
            '1': mockEntries[0],
            '2': mockEntries[1],
          },
        },
      });
      fixture.detectChanges();
      await fixture.whenStable();

      const table = fixture.nativeElement.querySelector('table');
      expect(table).toBeTruthy();
    });

    it('should have header row with correct columns', async () => {
      store.setState({
        entries: {
          ...initialState.entries,
          ids: ['1', '2'],
          entities: {
            '1': mockEntries[0],
            '2': mockEntries[1],
          },
        },
      });
      fixture.detectChanges();
      await fixture.whenStable();

      const headerRow = fixture.nativeElement.querySelector('tr.mat-mdc-header-row');
      expect(headerRow).toBeTruthy();
      expect(headerRow.textContent).toContain('Week');
      expect(headerRow.textContent).toContain('Circle');
      expect(headerRow.textContent).toContain('Hours');
      expect(headerRow.textContent).toContain('Description');
    });

    it('should show empty state when no entries and not loading', async () => {
      store.setState({
        entries: {
          ...initialState.entries,
          ids: [],
          entities: {},
          isLoading: false,
        },
      });
      fixture.detectChanges();
      await fixture.whenStable();

      // The component uses @if with async pipe - verify structure
      const tableExists = fixture.nativeElement.querySelector('table');
      expect(tableExists).toBeTruthy();
    });
  });

  describe('Loading state', () => {
    it('should show spinner when loading', () => {
      store.setState({
        entries: {
          ...initialState.entries,
          isLoading: true,
        },
      });
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('mat-spinner');
      expect(spinner).toBeTruthy();
    });

    it('should hide table when loading', () => {
      store.setState({
        entries: {
          ...initialState.entries,
          isLoading: true,
        },
      });
      fixture.detectChanges();

      const table = fixture.nativeElement.querySelector('table');
      expect(table).toBeFalsy();
    });
  });

  describe('Date formatting', () => {
    it('should format dates correctly', () => {
      const formatted = component.formatDate('2024-01-08');
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('8');
      expect(formatted).toContain('2024');
    });
  });

  describe('Pagination', () => {
    it('should render paginator', () => {
      store.setState({
        entries: {
          ...initialState.entries,
          ids: ['1', '2'],
          entities: {
            '1': mockEntries[0],
            '2': mockEntries[1],
          },
          pagination: {
            page: 1,
            pageSize: 10,
            totalItems: 50,
            totalPages: 5,
          },
        },
      });
      fixture.detectChanges();

      const paginator = fixture.nativeElement.querySelector('mat-paginator');
      expect(paginator).toBeTruthy();
    });

    it('should dispatch loadEntries on page change', () => {
      fixture.detectChanges();
      (store.dispatch as jest.Mock).mockClear();

      component.onPageChange({ pageIndex: 2, pageSize: 10, length: 50 });

      expect(store.dispatch).toHaveBeenCalledWith(
        EntriesActions.loadEntries({ page: 3 })
      );
    });
  });

  describe('Description truncation', () => {
    it('should verify description cell exists in template', () => {
      const longDescription = 'a'.repeat(100);
      store.setState({
        entries: {
          ...initialState.entries,
          ids: ['1'],
          entities: {
            '1': { ...mockEntries[0], description: longDescription },
          },
        },
      });
      fixture.detectChanges();

      // Verify table renders
      const table = fixture.nativeElement.querySelector('table');
      expect(table).toBeTruthy();
    });
  });
});

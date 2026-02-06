import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { LogHoursComponent } from './log-hours.component';
import { EntriesActions } from '../../store/entries/entries.actions';
import { CirclesActions } from '../../store/circles/circles.actions';

describe('LogHoursComponent', () => {
  let component: LogHoursComponent;
  let fixture: ComponentFixture<LogHoursComponent>;
  let store: MockStore;
  let snackBar: jest.Mocked<MatSnackBar>;

  const mockCircles = [
    { circleId: '1', circleName: 'Circle A' },
    { circleId: '2', circleName: 'Circle B' },
  ];

  const initialState = {
    circles: {
      circles: mockCircles,
      isLoading: false,
      error: null,
    },
    entries: {
      entries: [],
      createStatus: 'idle',
      isLoading: false,
      error: null,
    },
  };

  beforeEach(async () => {
    const snackBarMock = {
      open: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LogHoursComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        provideMockStore({ initialState }),
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    snackBar = TestBed.inject(MatSnackBar) as jest.Mocked<MatSnackBar>;
    jest.spyOn(store, 'dispatch');

    fixture = TestBed.createComponent(LogHoursComponent);
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

    it('should dispatch loadUserCircles on init', () => {
      fixture.detectChanges();
      expect(store.dispatch).toHaveBeenCalledWith(CirclesActions.loadUserCircles());
    });

    it('should initialize form with today date', () => {
      fixture.detectChanges();
      const today = new Date();
      const formDate = component.entryForm.get('date')?.value;
      expect(formDate.toDateString()).toBe(today.toDateString());
    });
  });

  describe('Form rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render date picker', () => {
      const datePicker = fixture.nativeElement.querySelector('mat-datepicker');
      expect(datePicker).toBeTruthy();
    });

    it('should render circle select', () => {
      const select = fixture.nativeElement.querySelector('mat-select[formControlName="circleId"]');
      expect(select).toBeTruthy();
    });

    it('should render hours input', () => {
      const hoursInput = fixture.nativeElement.querySelector('input[formControlName="hours"]');
      expect(hoursInput).toBeTruthy();
      expect(hoursInput.type).toBe('number');
    });

    it('should render description textarea', () => {
      const description = fixture.nativeElement.querySelector('textarea[formControlName="description"]');
      expect(description).toBeTruthy();
    });
  });

  describe('Form validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should be invalid when required fields are empty', () => {
      component.entryForm.patchValue({
        circleId: '',
        hours: null,
        description: '',
      });
      expect(component.entryForm.valid).toBeFalsy();
    });

    it('should be valid with all required fields', () => {
      component.entryForm.patchValue({
        date: new Date(),
        circleId: '1',
        hours: 2,
        description: 'Some work done',
      });
      expect(component.entryForm.valid).toBeTruthy();
    });

    it('should reject negative hours', () => {
      component.entryForm.patchValue({ hours: -1 });
      expect(component.entryForm.get('hours')?.hasError('min')).toBeTruthy();
    });

    it('should accept 0 hours', () => {
      component.entryForm.patchValue({ hours: 0 });
      expect(component.entryForm.get('hours')?.hasError('min')).toBeFalsy();
    });

    it('should reject description over 2000 characters', () => {
      const longDescription = 'a'.repeat(2001);
      component.entryForm.patchValue({ description: longDescription });
      expect(component.entryForm.get('description')?.hasError('maxlength')).toBeTruthy();
    });
  });

  describe('Zero hours reason field', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should not show reason field by default', () => {
      expect(component.showReasonField).toBeFalsy();
    });

    it('should show reason field when hours is 0', () => {
      component.entryForm.patchValue({ hours: 0 });
      fixture.detectChanges();
      expect(component.showReasonField).toBeTruthy();
    });

    it('should require reason when hours is 0', fakeAsync(() => {
      component.entryForm.patchValue({ hours: 0 });
      tick();
      expect(component.entryForm.get('zeroHoursReason')?.hasError('required')).toBeTruthy();
    }));

    it('should not require reason when hours > 0', fakeAsync(() => {
      component.entryForm.patchValue({ hours: 2 });
      tick();
      expect(component.entryForm.get('zeroHoursReason')?.hasError('required')).toBeFalsy();
    }));

    it('should clear reason when hours changes from 0', fakeAsync(() => {
      component.entryForm.patchValue({
        hours: 0,
        zeroHoursReason: 'On vacation',
      });
      tick();
      expect(component.entryForm.get('zeroHoursReason')?.value).toBe('On vacation');

      component.entryForm.patchValue({ hours: 2 });
      tick();
      expect(component.entryForm.get('zeroHoursReason')?.value).toBe('');
    }));
  });

  describe('Form submission', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should dispatch createEntry action on valid submit', () => {
      const testDate = new Date('2024-01-15');
      component.entryForm.patchValue({
        date: testDate,
        circleId: '1',
        hours: 2,
        description: 'Completed feature X',
      });

      component.onSubmit();

      expect(store.dispatch).toHaveBeenCalledWith(
        EntriesActions.createEntry({
          entry: {
            date: '2024-01-15',
            circleId: '1',
            hours: 2,
            description: 'Completed feature X',
          },
        })
      );
    });

    it('should include zeroHoursReason when hours is 0', fakeAsync(() => {
      const testDate = new Date('2024-01-15');
      component.entryForm.patchValue({
        date: testDate,
        circleId: '1',
        hours: 0,
        description: 'Planned to work but...',
      });
      tick();
      component.entryForm.patchValue({ zeroHoursReason: 'On vacation' });

      component.onSubmit();

      expect(store.dispatch).toHaveBeenCalledWith(
        EntriesActions.createEntry({
          entry: {
            date: '2024-01-15',
            circleId: '1',
            hours: 0,
            description: 'Planned to work but...',
            zeroHoursReason: 'On vacation',
          },
        })
      );
    }));

    it('should not dispatch when form is invalid', () => {
      component.entryForm.patchValue({
        circleId: '',
        hours: null,
        description: '',
      });
      (store.dispatch as jest.Mock).mockClear();

      component.onSubmit();

      expect(store.dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: expect.stringContaining('Entry') })
      );
    });
  });

  describe('Cancel button', () => {
    it('should have cancel button linking to dashboard', () => {
      fixture.detectChanges();
      const cancelButton = fixture.nativeElement.querySelector('button[routerLink="/app/dashboard"]');
      expect(cancelButton).toBeTruthy();
      expect(cancelButton.textContent).toContain('Cancel');
    });
  });

  describe('Submit button state', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should disable submit when form is invalid', () => {
      component.entryForm.patchValue({
        circleId: '',
        hours: null,
        description: '',
      });
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(submitButton.disabled).toBeTruthy();
    });

    it('should have valid form when all required fields filled', () => {
      component.entryForm.patchValue({
        date: new Date(),
        circleId: '1',
        hours: 2,
        description: 'Work done',
      });
      fixture.detectChanges();

      // Form should be valid
      expect(component.entryForm.valid).toBeTruthy();
    });
  });
});

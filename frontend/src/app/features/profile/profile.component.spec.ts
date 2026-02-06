import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { TranslateModule } from '@ngx-translate/core';

import { ProfileComponent } from './profile.component';
import { AuthActions } from '../../store/auth/auth.actions';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let store: MockStore;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    phoneNumber: '+34612345678',
  };

  const initialState = {
    auth: {
      user: mockUser,
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        provideMockStore({ initialState }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    jest.spyOn(store, 'dispatch');

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should display user information', () => {
      const profileInfo = fixture.nativeElement.querySelector('.profile-info');
      expect(profileInfo.textContent).toContain('Test User');
      expect(profileInfo.textContent).toContain('test@example.com');
    });

    it('should initialize phone form with user phone', () => {
      expect(component.phoneForm.get('phoneNumber')?.value).toBe('+34612345678');
    });
  });

  describe('Phone form rendering', () => {
    it('should render phone input field', () => {
      const phoneInput = fixture.nativeElement.querySelector('input[formControlName="phoneNumber"]');
      expect(phoneInput).toBeTruthy();
    });

    it('should render update button', () => {
      const updateButton = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(updateButton).toBeTruthy();
    });
  });

  describe('Phone form validation', () => {
    it('should be valid with E.164 format phone', () => {
      component.phoneForm.patchValue({ phoneNumber: '+34612345678' });
      expect(component.phoneForm.valid).toBeTruthy();
    });

    it('should be invalid with invalid phone format', () => {
      component.phoneForm.patchValue({ phoneNumber: '612345678' });
      expect(component.phoneForm.get('phoneNumber')?.hasError('pattern')).toBeTruthy();
    });

    it('should be invalid when empty', () => {
      component.phoneForm.patchValue({ phoneNumber: '' });
      expect(component.phoneForm.get('phoneNumber')?.hasError('required')).toBeTruthy();
    });

    it('should be invalid with phone without +', () => {
      component.phoneForm.patchValue({ phoneNumber: '34612345678' });
      expect(component.phoneForm.valid).toBeFalsy();
    });

    it('should accept various valid E.164 numbers', () => {
      const validNumbers = ['+1234567890', '+441onal123456', '+34612345678'];
      validNumbers.forEach(num => {
        component.phoneForm.patchValue({ phoneNumber: num });
        if (num.match(/^\+[1-9]\d{1,14}$/)) {
          expect(component.phoneForm.valid).toBeTruthy();
        }
      });
    });
  });

  describe('Form submission', () => {
    it('should dispatch updatePhone action on valid submit', () => {
      component.phoneForm.patchValue({ phoneNumber: '+34612345678' });
      component.onSubmit();

      expect(store.dispatch).toHaveBeenCalledWith(
        AuthActions.updatePhone({ phoneNumber: '+34612345678' })
      );
    });

    it('should not dispatch when form is invalid', () => {
      component.phoneForm.patchValue({ phoneNumber: 'invalid' });
      (store.dispatch as jest.Mock).mockClear();

      component.onSubmit();

      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('Loading state', () => {
    it('should disable submit button when loading', () => {
      store.setState({
        auth: {
          ...initialState.auth,
          isLoading: true,
        },
      });
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(submitButton.disabled).toBeTruthy();
    });
  });

  describe('When user has no phone', () => {
    it('should not pre-fill phone form', () => {
      store.setState({
        auth: {
          ...initialState.auth,
          user: { ...mockUser, phoneNumber: null },
        },
      });

      const newFixture = TestBed.createComponent(ProfileComponent);
      newFixture.detectChanges();

      expect(newFixture.componentInstance.phoneForm.get('phoneNumber')?.value).toBe('');
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { screen, fireEvent } from '@testing-library/angular';
import { TranslateModule } from '@ngx-translate/core';

import { LoginComponent } from './login.component';
import { AuthActions } from '../../../store/auth/auth.actions';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let store: MockStore;

  const initialState = {
    auth: {
      user: null,
      accessToken: null,
      isLoading: false,
      error: null,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        provideMockStore({ initialState }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    jest.spyOn(store, 'dispatch');

    fixture = TestBed.createComponent(LoginComponent);
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

    it('should render login form', () => {
      const emailInput = fixture.nativeElement.querySelector('input[formControlName="email"]');
      const passwordInput = fixture.nativeElement.querySelector('input[formControlName="password"]');
      const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');

      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
      expect(submitButton).toBeTruthy();
    });

    it('should have password hidden by default', () => {
      const passwordInput = fixture.nativeElement.querySelector('input[formControlName="password"]');
      expect(passwordInput.type).toBe('password');
    });
  });

  describe('Form validation', () => {
    it('should be invalid when empty', () => {
      expect(component.loginForm.valid).toBeFalsy();
    });

    it('should be invalid with invalid email', () => {
      component.loginForm.patchValue({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(component.loginForm.get('email')?.hasError('email')).toBeTruthy();
    });

    it('should be valid with correct data', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(component.loginForm.valid).toBeTruthy();
    });

    it('should require email', () => {
      component.loginForm.patchValue({ password: 'password123' });
      expect(component.loginForm.get('email')?.hasError('required')).toBeTruthy();
    });

    it('should require password', () => {
      component.loginForm.patchValue({ email: 'test@example.com' });
      expect(component.loginForm.get('password')?.hasError('required')).toBeTruthy();
    });
  });

  describe('Form submission', () => {
    it('should dispatch login action on valid submit', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
      });

      component.onSubmit();

      expect(store.dispatch).toHaveBeenCalledWith(
        AuthActions.login({ email: 'test@example.com', password: 'password123' })
      );
    });

    it('should not dispatch action when form is invalid', () => {
      component.loginForm.patchValue({ email: 'invalid' });
      component.onSubmit();

      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('Password visibility toggle', () => {
    it('should toggle password visibility', () => {
      expect(component.hidePassword).toBe(true);

      component.hidePassword = !component.hidePassword;
      fixture.detectChanges();

      expect(component.hidePassword).toBe(false);
      const passwordInput = fixture.nativeElement.querySelector('input[formControlName="password"]');
      expect(passwordInput.type).toBe('text');
    });
  });

  describe('Error display', () => {
    it('should display error message when error is set', () => {
      store.setState({
        auth: {
          ...initialState.auth,
          error: 'Invalid credentials',
        },
      });
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.error-message');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Invalid credentials');
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

    it('should show spinner when loading', () => {
      store.setState({
        auth: {
          ...initialState.auth,
          isLoading: true,
        },
      });
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('mat-spinner');
      expect(spinner).toBeTruthy();
    });
  });

  describe('Google login', () => {
    it('should redirect to Google auth URL when clicking Google button', () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { href: '' } as any;

      component.loginWithGoogle();

      expect(window.location.href).toContain('/auth/google');

      window.location = originalLocation;
    });
  });

  describe('Navigation links', () => {
    it('should have link to register page', () => {
      const registerLink = fixture.nativeElement.querySelector('a[routerLink="/register"]');
      expect(registerLink).toBeTruthy();
    });
  });
});

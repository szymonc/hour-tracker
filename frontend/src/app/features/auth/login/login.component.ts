import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { AuthActions } from '../../../store/auth/auth.actions';
import { LanguageService } from '../../../core/services/language.service';
import { selectIsLoading, selectError } from '../../../store/auth/auth.selectors';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslateModule,
  ],
  template: `
    <div class="login-container">
      <div class="language-selector">
        <mat-form-field appearance="outline">
          <mat-select [value]="languageService.currentLanguage" (selectionChange)="onLanguageChange($event.value)">
            @for (lang of languageService.supportedLanguages; track lang.code) {
              <mat-option [value]="lang.code">{{ lang.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon class="logo-icon">eco</mat-icon>
            {{ 'app.name' | translate }}
          </mat-card-title>
          <mat-card-subtitle>{{ 'auth.login' | translate }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (error$ | async; as error) {
            <div class="error-message">{{ error }}</div>
          }

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>{{ 'auth.email' | translate }}</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
              @if (loginForm.get('email')?.hasError('required')) {
                <mat-error>{{ 'validation.required' | translate }}</mat-error>
              }
              @if (loginForm.get('email')?.hasError('email')) {
                <mat-error>{{ 'validation.email' | translate }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>{{ 'auth.password' | translate }}</mat-label>
              <input
                matInput
                [type]="hidePassword ? 'password' : 'text'"
                formControlName="password"
                autocomplete="current-password"
              />
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="hidePassword = !hidePassword"
              >
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (loginForm.get('password')?.hasError('required')) {
                <mat-error>{{ 'validation.required' | translate }}</mat-error>
              }
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="submit-button"
              [disabled]="loginForm.invalid || (isLoading$ | async)"
            >
              @if (isLoading$ | async) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                {{ 'auth.signIn' | translate }}
              }
            </button>
          </form>

          <mat-divider class="divider">
            <span>{{ 'auth.orContinueWith' | translate }}</span>
          </mat-divider>

          <button
            mat-stroked-button
            class="google-button"
            (click)="loginWithGoogle()"
            [disabled]="isLoading$ | async"
          >
            <img src="assets/google-icon.svg" alt="Google" class="google-icon" />
            {{ 'auth.google' | translate }}
          </button>
        </mat-card-content>

        <mat-card-actions>
          <p class="register-link">
            {{ 'auth.noAccount' | translate }}
            <a routerLink="/register">{{ 'auth.signUp' | translate }}</a>
          </p>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: linear-gradient(135deg, #e8f5e9 0%, #f3e5f5 100%);
    }

    .language-selector {
      position: absolute;
      top: 16px;
      right: 16px;

      mat-form-field {
        width: 120px;
      }
    }

    .login-card {
      max-width: 400px;
      width: 100%;
      padding: 24px;
    }

    mat-card-header {
      justify-content: center;
      text-align: center;
      margin-bottom: 24px;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 24px;
    }

    .logo-icon {
      color: var(--color-forest);
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .form-field-full {
      width: 100%;
      margin-bottom: 8px;
    }

    .submit-button {
      width: 100%;
      height: 48px;
      font-size: 16px;
    }

    .divider {
      margin: 24px 0;
      display: flex;
      align-items: center;

      span {
        padding: 0 16px;
        color: rgba(0, 0, 0, 0.54);
        font-size: 14px;
      }
    }

    .google-button {
      width: 100%;
      height: 48px;
    }

    .google-icon {
      width: 20px;
      height: 20px;
      margin-right: 8px;
    }

    .register-link {
      text-align: center;
      margin: 16px 0 0;
      color: rgba(0, 0, 0, 0.6);

      a {
        color: var(--color-forest);
        text-decoration: none;
        font-weight: 500;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    .error-message {
      background-color: #ffebee;
      color: #c62828;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 14px;
    }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  languageService = inject(LanguageService);

  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectError);

  hidePassword = true;

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.store.dispatch(AuthActions.login({ email, password }));
    }
  }

  loginWithGoogle(): void {
    window.location.href = `${environment.apiUrl}/auth/google`;
  }

  onLanguageChange(langCode: string): void {
    this.languageService.setLanguage(langCode);
  }
}

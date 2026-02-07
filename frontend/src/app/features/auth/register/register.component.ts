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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { AuthActions } from '../../../store/auth/auth.actions';
import { selectIsLoading, selectError } from '../../../store/auth/auth.selectors';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-register',
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
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslateModule,
  ],
  template: `
    <div class="register-container">
      <div class="language-selector">
        <mat-form-field appearance="outline">
          <mat-select [value]="languageService.currentLanguage" (selectionChange)="onLanguageChange($event.value)">
            @for (lang of languageService.supportedLanguages; track lang.code) {
              <mat-option [value]="lang.code">{{ lang.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <mat-card class="register-card">
        <mat-card-header>
          <mat-card-title>{{ 'auth.register' | translate }}</mat-card-title>
          <mat-card-subtitle>{{ 'app.name' | translate }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (error$ | async; as error) {
            <div class="error-message">{{ error }}</div>
          }

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>{{ 'auth.name' | translate }}</mat-label>
              <input matInput formControlName="name" autocomplete="name" />
              @if (registerForm.get('name')?.hasError('required')) {
                <mat-error>{{ 'validation.required' | translate }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>{{ 'auth.email' | translate }}</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
              @if (registerForm.get('email')?.hasError('required')) {
                <mat-error>{{ 'validation.required' | translate }}</mat-error>
              }
              @if (registerForm.get('email')?.hasError('email')) {
                <mat-error>{{ 'validation.email' | translate }}</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>{{ 'auth.password' | translate }}</mat-label>
              <input
                matInput
                [type]="hidePassword ? 'password' : 'text'"
                formControlName="password"
                autocomplete="new-password"
              />
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (registerForm.get('password')?.hasError('required')) {
                <mat-error>{{ 'validation.required' | translate }}</mat-error>
              }
              @if (registerForm.get('password')?.hasError('minlength')) {
                <mat-error>{{ 'validation.minLength' | translate: {length: 8} }}</mat-error>
              }
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="submit-button"
              [disabled]="registerForm.invalid || (isLoading$ | async)"
            >
              @if (isLoading$ | async) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                {{ 'auth.register' | translate }}
              }
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <p class="login-link">
            {{ 'auth.hasAccount' | translate }}
            <a routerLink="/login">{{ 'auth.signIn' | translate }}</a>
          </p>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
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

    .register-card {
      max-width: 400px;
      width: 100%;
      padding: 24px;
    }

    mat-card-header {
      justify-content: center;
      text-align: center;
      margin-bottom: 24px;
    }

    .form-field-full {
      width: 100%;
      margin-bottom: 8px;
    }

    .submit-button {
      width: 100%;
      height: 48px;
      font-size: 16px;
      margin-top: 16px;
    }

    .login-link {
      text-align: center;
      margin: 16px 0 0;
      color: rgba(0, 0, 0, 0.6);

      a {
        color: var(--color-forest);
        text-decoration: none;
        font-weight: 500;
      }
    }

    .error-message {
      background-color: #ffebee;
      color: #c62828;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
  `],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  languageService = inject(LanguageService);

  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectError);

  hidePassword = true;

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit(): void {
    if (this.registerForm.valid) {
      const { name, email, password } = this.registerForm.value;
      this.store.dispatch(AuthActions.register({ name, email, password }));
    }
  }

  onLanguageChange(langCode: string): void {
    this.languageService.setLanguage(langCode);
  }
}

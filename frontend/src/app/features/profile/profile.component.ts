import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule } from '@ngx-translate/core';

import { AuthActions } from '../../store/auth/auth.actions';
import { selectUser, selectIsLoading, selectError } from '../../store/auth/auth.selectors';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDividerModule,
    TranslateModule,
  ],
  template: `
    <div class="profile-container page-container">
      <h1>{{ 'profile.title' | translate }}</h1>

      <mat-card>
        <mat-card-content>
          @if (user$ | async; as user) {
            <div class="profile-info">
              <p><strong>{{ 'profile.name' | translate }}:</strong> {{ user.name }}</p>
              <p><strong>{{ 'profile.email' | translate }}:</strong> {{ user.email }}</p>
            </div>

            <h3>{{ 'profile.updatePhone' | translate }}</h3>
            <form [formGroup]="phoneForm" (ngSubmit)="onSubmit()">
              <mat-form-field appearance="outline" class="form-field-full">
                <mat-label>{{ 'profile.phone' | translate }}</mat-label>
                <input matInput type="tel" formControlName="phoneNumber" />
                <mat-hint>E.164 format (e.g., +34612345678)</mat-hint>
              </mat-form-field>

              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="phoneForm.invalid || (isLoading$ | async)"
              >
                @if (isLoading$ | async) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  {{ 'profile.updatePhone' | translate }}
                }
              </button>
            </form>

            <mat-divider class="section-divider"></mat-divider>

            <h3>{{ 'profile.language' | translate }}</h3>
            <mat-form-field appearance="outline" class="form-field-full">
              <mat-label>{{ 'profile.selectLanguage' | translate }}</mat-label>
              <mat-select [value]="languageService.currentLanguage" (selectionChange)="onLanguageChange($event.value)">
                @for (lang of languageService.supportedLanguages; track lang.code) {
                  <mat-option [value]="lang.code">{{ lang.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .profile-info {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.12);

      p {
        margin: 8px 0;
      }
    }

    h3 {
      margin-bottom: 16px;
    }

    .form-field-full {
      width: 100%;
      margin-bottom: 16px;
    }

    .section-divider {
      margin: 32px 0;
    }
  `],
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  languageService = inject(LanguageService);

  user$ = this.store.select(selectUser);
  isLoading$ = this.store.select(selectIsLoading);
  error$ = this.store.select(selectError);

  phoneForm: FormGroup = this.fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{1,14}$/)]],
  });

  ngOnInit(): void {
    this.user$.subscribe(user => {
      if (user?.phoneNumber) {
        this.phoneForm.patchValue({ phoneNumber: user.phoneNumber });
      }
    });
  }

  onSubmit(): void {
    if (this.phoneForm.valid) {
      const { phoneNumber } = this.phoneForm.value;
      this.store.dispatch(AuthActions.updatePhone({ phoneNumber }));
    }
  }

  onLanguageChange(langCode: string): void {
    this.languageService.setLanguage(langCode);
  }
}

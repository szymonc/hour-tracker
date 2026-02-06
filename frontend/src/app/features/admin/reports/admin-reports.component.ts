import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { AdminActions } from '../../../store/admin/admin.actions';
import { selectReportGenerating } from '../../../store/admin/admin.reducer';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  template: `
    <div class="admin-reports page-container">
      <h1>Reports</h1>

      <mat-card>
        <mat-card-header>
          <mat-card-title>Export CSV Report</mat-card-title>
          <mat-card-subtitle>Download hours data for a date range</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="reportForm" (ngSubmit)="onSubmit()">
            <div class="date-range">
              <mat-form-field appearance="outline">
                <mat-label>From Date</mat-label>
                <input matInput [matDatepicker]="fromPicker" formControlName="from" data-testid="from-date" />
                <mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle>
                <mat-datepicker #fromPicker></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>To Date</mat-label>
                <input matInput [matDatepicker]="toPicker" formControlName="to" data-testid="to-date" />
                <mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle>
                <mat-datepicker #toPicker></mat-datepicker>
              </mat-form-field>
            </div>

            <button
              mat-raised-button
              color="primary"
              type="submit"
              [disabled]="reportForm.invalid || (isGenerating$ | async)"
              data-testid="download-csv"
            >
              @if (isGenerating$ | async) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>download</mat-icon> Download CSV
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .admin-reports { max-width: 600px; margin: 0 auto; }
    .date-range { display: flex; gap: 16px; margin-bottom: 24px; }
    mat-form-field { flex: 1; }
  `],
})
export class AdminReportsComponent {
  private fb = inject(FormBuilder);
  private store = inject(Store);

  isGenerating$ = this.store.select(selectReportGenerating);

  reportForm: FormGroup = this.fb.group({
    from: [null, Validators.required],
    to: [null, Validators.required],
  });

  onSubmit(): void {
    if (this.reportForm.valid) {
      const { from, to } = this.reportForm.value;
      this.store.dispatch(
        AdminActions.generateCSVReport({
          from: from.toISOString().split('T')[0],
          to: to.toISOString().split('T')[0],
        })
      );
    }
  }
}

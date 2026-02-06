import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { selectUser } from '../../store/auth/auth.selectors';
import { AuthActions } from '../../store/auth/auth.actions';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    MatDividerModule,
    MatSelectModule,
    TranslateModule,
  ],
  template: `
    <div class="admin-container">
      <mat-toolbar color="primary" class="admin-toolbar">
        <a routerLink="/admin/dashboard" class="logo">
          <mat-icon>admin_panel_settings</mat-icon>
          <span>{{ 'app.adminName' | translate }}</span>
        </a>

        <nav class="admin-nav">
          <a mat-button routerLink="/admin/dashboard" routerLinkActive="active">
            <mat-icon>dashboard</mat-icon>
            {{ 'nav.dashboard' | translate }}
          </a>
          <a mat-button routerLink="/admin/users" routerLinkActive="active">
            <mat-icon>people</mat-icon>
            {{ 'nav.users' | translate }}
          </a>
          <a mat-button routerLink="/admin/circles" routerLinkActive="active">
            <mat-icon>groups</mat-icon>
            {{ 'nav.circles' | translate }}
          </a>
          <a mat-button routerLink="/admin/reports" routerLinkActive="active">
            <mat-icon>assessment</mat-icon>
            {{ 'nav.reports' | translate }}
          </a>
          <a mat-button routerLink="/admin/reminders" routerLinkActive="active">
            <mat-icon>notifications</mat-icon>
            {{ 'nav.reminders' | translate }}
          </a>
          <a mat-button routerLink="/admin/backfill" routerLinkActive="active">
            <mat-icon>history</mat-icon>
            {{ 'nav.backfill' | translate }}
          </a>
        </nav>

        <span class="spacer"></span>

        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <div class="user-info">
            <strong>{{ (user$ | async)?.name }}</strong>
            <span>{{ (user$ | async)?.email }}</span>
          </div>
          <mat-divider></mat-divider>
          <div class="language-menu-item" (click)="$event.stopPropagation()">
            <mat-icon>language</mat-icon>
            <mat-select [value]="languageService.currentLanguage" (selectionChange)="onLanguageChange($event.value)">
              @for (lang of languageService.supportedLanguages; track lang.code) {
                <mat-option [value]="lang.code">{{ lang.name }}</mat-option>
              }
            </mat-select>
          </div>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>{{ 'nav.logout' | translate }}</span>
          </button>
        </mat-menu>
      </mat-toolbar>

      <main class="admin-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .admin-container {
      min-height: 100vh;
      background-color: #f5f5f5;
    }

    .admin-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      color: white;
      text-decoration: none;
      font-size: 18px;
      font-weight: 500;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    .admin-nav {
      display: flex;
      gap: 4px;
      margin-left: 24px;

      a {
        color: rgba(255, 255, 255, 0.9);

        mat-icon {
          margin-right: 4px;
        }

        &.active {
          background-color: rgba(255, 255, 255, 0.15);
          color: white;
        }

        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      }
    }

    .spacer {
      flex: 1;
    }

    .user-info {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;

      strong {
        font-size: 14px;
      }

      span {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);
      }
    }

    .language-menu-item {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      gap: 16px;

      mat-icon {
        color: rgba(0, 0, 0, 0.54);
      }

      mat-select {
        flex: 1;
      }
    }

    .admin-content {
      padding: 24px;
      min-height: calc(100vh - 64px);
    }

    @media (max-width: 900px) {
      .admin-nav a span {
        display: none;
      }

      .admin-nav a mat-icon {
        margin-right: 0;
      }
    }

    @media (max-width: 600px) {
      .logo span {
        display: none;
      }
    }
  `],
})
export class AdminShellComponent {
  private store = inject(Store);
  languageService = inject(LanguageService);

  user$ = this.store.select(selectUser);

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }

  onLanguageChange(langCode: string): void {
    this.languageService.setLanguage(langCode);
  }
}

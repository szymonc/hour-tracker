import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { AuthActions } from './store/auth/auth.actions';
import { selectIsAuthenticated, selectUser, selectIsAdmin } from './store/auth/auth.selectors';
import { User } from './store/auth/auth.models';

@Component({
  selector: 'app-root',
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
    MatListModule,
    TranslateModule,
  ],
  template: `
    <mat-sidenav-container class="app-container">
      <mat-sidenav
        #sidenav
        mode="over"
        [opened]="false"
        class="mobile-nav"
      >
        <mat-nav-list>
          @if ((isAuthenticated$ | async) && !(isAdmin$ | async)) {
            <a mat-list-item routerLink="/app/dashboard" (click)="sidenav.close()">
              <mat-icon matListItemIcon>dashboard</mat-icon>
              <span matListItemTitle>{{ 'nav.dashboard' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/app/log-hours" (click)="sidenav.close()">
              <mat-icon matListItemIcon>add_circle</mat-icon>
              <span matListItemTitle>{{ 'nav.logHours' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/app/history" (click)="sidenav.close()">
              <mat-icon matListItemIcon>history</mat-icon>
              <span matListItemTitle>{{ 'nav.history' | translate }}</span>
            </a>
            <a mat-list-item routerLink="/app/profile" (click)="sidenav.close()">
              <mat-icon matListItemIcon>person</mat-icon>
              <span matListItemTitle>{{ 'nav.profile' | translate }}</span>
            </a>
            <mat-divider></mat-divider>
            <a mat-list-item (click)="logout(); sidenav.close()">
              <mat-icon matListItemIcon>logout</mat-icon>
              <span matListItemTitle>{{ 'nav.logout' | translate }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        @if ((isAuthenticated$ | async) && !(isAdmin$ | async)) {
          <mat-toolbar color="primary" class="app-toolbar">
            <button mat-icon-button (click)="sidenav.toggle()" class="hide-desktop">
              <mat-icon>menu</mat-icon>
            </button>

            <a class="logo" routerLink="/app/dashboard">
              <mat-icon>eco</mat-icon>
              {{ 'app.name' | translate }}
            </a>

            <nav class="nav-links hide-mobile">
              <a mat-button routerLink="/app/dashboard" routerLinkActive="active">
                {{ 'nav.dashboard' | translate }}
              </a>
              <a mat-button routerLink="/app/log-hours" routerLinkActive="active">
                {{ 'nav.logHours' | translate }}
              </a>
              <a mat-button routerLink="/app/history" routerLinkActive="active">
                {{ 'nav.history' | translate }}
              </a>
            </nav>

            <span class="spacer"></span>

            <button mat-icon-button [matMenuTriggerFor]="userMenu">
              <mat-icon>account_circle</mat-icon>
            </button>

            <mat-menu #userMenu="matMenu">
              @if (user$ | async; as user) {
                <div class="user-menu-header">
                  <strong>{{ user.name }}</strong>
                  <small>{{ user.email }}</small>
                </div>
                <mat-divider></mat-divider>
              }
              <button mat-menu-item routerLink="/app/profile">
                <mat-icon>person</mat-icon>
                <span>{{ 'nav.profile' | translate }}</span>
              </button>
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon>
                <span>{{ 'nav.logout' | translate }}</span>
              </button>
            </mat-menu>
          </mat-toolbar>
        }

        <main>
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-container {
      height: 100vh;
    }

    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      color: inherit;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    .nav-links {
      margin-left: 24px;
      display: flex;
      align-items: center;

      a {
        margin: 0 4px;

        &.active {
          background-color: rgba(255, 255, 255, 0.1);
        }
      }
    }

    .spacer {
      flex: 1;
    }

    .user-menu-header {
      padding: 16px;
      display: flex;
      flex-direction: column;

      small {
        color: rgba(0, 0, 0, 0.6);
        margin-top: 4px;
      }
    }

    .mobile-nav {
      width: 280px;
    }

    main {
      min-height: calc(100vh - 64px);
    }

    @media (max-width: 768px) {
      .hide-mobile {
        display: none !important;
      }
    }

    @media (min-width: 769px) {
      .hide-desktop {
        display: none !important;
      }
    }
  `],
})
export class AppComponent {
  private store = inject(Store);

  isAuthenticated$: Observable<boolean> = this.store.select(selectIsAuthenticated);
  user$: Observable<User | null> = this.store.select(selectUser);
  isAdmin$: Observable<boolean> = this.store.select(selectIsAdmin);

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}

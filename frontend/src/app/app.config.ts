import { ApplicationConfig, isDevMode, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideStore, Store } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideRouterStore } from '@ngrx/router-store';
import { lastValueFrom, of } from 'rxjs';
import { catchError, tap, timeout } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

import { authFeature } from './store/auth/auth.reducer';
import { circlesFeature } from './store/circles/circles.reducer';
import { entriesFeature } from './store/entries/entries.reducer';
import { summariesFeature } from './store/summaries/summaries.reducer';
import { adminFeature } from './store/admin/admin.reducer';

import { AuthActions } from './store/auth/auth.actions';
import { AuthEffects } from './store/auth/auth.effects';
import { CirclesEffects } from './store/circles/circles.effects';
import { EntriesEffects } from './store/entries/entries.effects';
import { SummariesEffects } from './store/summaries/summaries.effects';
import { AdminEffects } from './store/admin/admin.effects';

import { AuthService } from './core/services/auth.service';

const SESSION_RESTORE_TIMEOUT_MS = 15_000;
const SUPPORTED_LANGUAGES = ['en', 'es'];
const DEFAULT_LANGUAGE = 'en';

function detectBrowserLanguage(): string {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LANGUAGE;
  }
  const browserLang = navigator.language?.split('-')[0] || DEFAULT_LANGUAGE;
  return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : DEFAULT_LANGUAGE;
}

function initializeTranslations(translate: TranslateService): () => Promise<void> {
  return () => {
    translate.addLangs(SUPPORTED_LANGUAGES);
    translate.setDefaultLang(DEFAULT_LANGUAGE);

    // Check for saved preference, otherwise detect from browser
    const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('preferredLanguage') : null;
    const langToUse = savedLang && SUPPORTED_LANGUAGES.includes(savedLang) ? savedLang : detectBrowserLanguage();

    return lastValueFrom(translate.use(langToUse)).then(() => undefined);
  };
}

function restoreSessionInitializer(store: Store, authService: AuthService): () => Promise<void> {
  return () => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      return Promise.resolve();
    }
    return lastValueFrom(
      authService.getProfileWithToken(token).pipe(
        timeout(SESSION_RESTORE_TIMEOUT_MS),
        tap((user) => {
          store.dispatch(AuthActions.restoreSessionSuccess({ user, accessToken: token }));
        }),
        catchError(() => {
          localStorage.removeItem('accessToken');
          store.dispatch(AuthActions.restoreSessionFailure());
          return of(undefined);
        })
      )
    ).then(() => undefined).catch(() => {
      // Timeout or unexpected error: allow app to bootstrap (user will see login if not authenticated)
      localStorage.removeItem('accessToken');
      store.dispatch(AuthActions.restoreSessionFailure());
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    provideAnimationsAsync(),
    provideStore({
      [authFeature.name]: authFeature.reducer,
      [circlesFeature.name]: circlesFeature.reducer,
      [entriesFeature.name]: entriesFeature.reducer,
      [summariesFeature.name]: summariesFeature.reducer,
      [adminFeature.name]: adminFeature.reducer,
    }),
    provideEffects([
      AuthEffects,
      CirclesEffects,
      EntriesEffects,
      SummariesEffects,
      AdminEffects,
    ]),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode(),
      autoPause: true,
      connectInZone: true,
    }),
    provideRouterStore(),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: DEFAULT_LANGUAGE,
      })
    ),
    ...provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json',
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTranslations,
      deps: [TranslateService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: restoreSessionInitializer,
      deps: [Store, AuthService],
      multi: true,
    },
  ],
};

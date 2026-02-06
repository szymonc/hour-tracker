import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface Language {
  code: string;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private translate = inject(TranslateService);

  readonly supportedLanguages: Language[] = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
  ];

  get currentLanguage(): string {
    return this.translate.currentLang || this.translate.defaultLang || 'en';
  }

  setLanguage(langCode: string): void {
    if (this.supportedLanguages.some((l) => l.code === langCode)) {
      this.translate.use(langCode);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('preferredLanguage', langCode);
      }
    }
  }

  getCurrentLanguageName(): string {
    const lang = this.supportedLanguages.find((l) => l.code === this.currentLanguage);
    return lang?.name || 'English';
  }
}

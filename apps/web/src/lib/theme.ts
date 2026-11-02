import { THEMES, type Theme } from '@savdo/shared';
import { readStorage, THEME_KEY } from './storage';

export function initialTheme(): Theme {
  const v = readStorage(THEME_KEY);
  return (THEMES as readonly string[]).includes(v ?? '') ? (v as Theme) : 'system';
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

export function applyTheme(theme: Theme): void {
  const dark = theme === 'dark' || (theme === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

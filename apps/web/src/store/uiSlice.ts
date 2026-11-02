import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_LOCALE, LOCALES, type Locale, type Theme } from '@savdo/shared';
import { LOCALE_KEY, readStorage } from '@/lib/storage';
import { initialTheme } from '@/lib/theme';

export interface UiState {
  theme: Theme;
  locale: Locale;
}

function initialLocale(): Locale {
  const v = readStorage(LOCALE_KEY);
  return (LOCALES as readonly string[]).includes(v ?? '') ? (v as Locale) : DEFAULT_LOCALE;
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState: (): UiState => ({ theme: initialTheme(), locale: initialLocale() }),
  reducers: {
    setTheme(state, a: PayloadAction<Theme>) {
      state.theme = a.payload;
    },
    setLocale(state, a: PayloadAction<Locale>) {
      state.locale = a.payload;
    },
  },
});

export const { setTheme, setLocale } = uiSlice.actions;

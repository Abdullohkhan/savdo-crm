/** localStorage — private rejimda yoki bloklanganda xato bermasligi uchun try/catch */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // e'tiborsiz
  }
}

export const THEME_KEY = 'savdo.theme';
export const LOCALE_KEY = 'savdo.locale';

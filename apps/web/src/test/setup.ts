import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { initI18n } from '@/i18n';

initI18n('uz');

afterEach(() => {
  cleanup();
  document.documentElement.className = '';
  try {
    localStorage.clear();
  } catch {
    // e'tiborsiz
  }
});

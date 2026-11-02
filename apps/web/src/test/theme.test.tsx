import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AppEffects } from '@/AppEffects';
import { ThemeSwitcher } from '@/components/Switchers';
import { renderWithStore, makeUser } from './utils';

describe('tema', () => {
  it("dark klassini qo'yadi va olib tashlaydi, tanlovni saqlaydi", async () => {
    renderWithStore(
      <>
        <AppEffects />
        <ThemeSwitcher />
      </>,
      { user: makeUser() },
    );
    const select = screen.getByRole('combobox', { name: 'Tema' });
    const html = document.documentElement;

    await userEvent.selectOptions(select, 'dark');
    expect(html).toHaveClass('dark');
    expect(localStorage.getItem('savdo.theme')).toBe('dark');

    await userEvent.selectOptions(select, 'light');
    expect(html).not.toHaveClass('dark');
    expect(localStorage.getItem('savdo.theme')).toBe('light');
  });
});

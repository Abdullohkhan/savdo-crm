import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '@/AppRoutes';
import { Layout } from '@/components/Layout';
import { MenuPage } from '@/pages/MenuPage';
import { makeUser, renderWithStore } from './utils';

describe('rolga qarab menyu', () => {
  it('OWNER "Xodimlar" menyusini ko`radi (yon panel va telefondagi "Menyu")', () => {
    const { unmount } = renderWithStore(<Layout />, { user: makeUser({ role: 'OWNER' }) });
    expect(screen.getAllByRole('link', { name: /Xodimlar/ })).toHaveLength(1);
    unmount();
    renderWithStore(<MenuPage />, { user: makeUser({ role: 'OWNER' }) });
    expect(screen.getByRole('link', { name: /Xodimlar/ })).toBeInTheDocument();
  });

  it.each(['BUXGALTER', 'SOTUVCHI', 'OMBORCHI'] as const)(
    '%s "Xodimlar" menyusini ko`rmaydi',
    (role) => {
      renderWithStore(<Layout />, { user: makeUser({ role }) });
      expect(screen.queryByRole('link', { name: /Xodimlar/ })).not.toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: /Sozlamalar/ }).length).toBeGreaterThan(0);
    },
  );

  it('OWNER bo`lmagan /users ga kirsa — "Ruxsat yo`q"', () => {
    renderWithStore(<AppRoutes />, { user: makeUser({ role: 'SOTUVCHI' }), route: '/users' });
    expect(screen.getByText("Ruxsat yo'q")).toBeInTheDocument();
  });

  it('kirmagan foydalanuvchi login sahifasiga yo`naltiriladi', () => {
    renderWithStore(<AppRoutes />, { route: '/settings' });
    expect(screen.getByRole('button', { name: 'Kirish' })).toBeInTheDocument();
  });
});

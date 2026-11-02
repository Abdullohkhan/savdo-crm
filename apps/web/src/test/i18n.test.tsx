import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppEffects } from '@/AppEffects';
import { Layout } from '@/components/Layout';
import uz from '@/i18n/locales/uz.json';
import en from '@/i18n/locales/en.json';
import ru from '@/i18n/locales/ru.json';
import { makeUser, renderWithStore } from './utils';

function keys(o: object, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('til', () => {
  afterEach(() => vi.unstubAllGlobals());

  it("til almashganda matn o'zgaradi va serverga saqlanadi", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(makeUser({ locale: 'en' })), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithStore(
      <>
        <AppEffects />
        <Layout />
      </>,
      { user: makeUser() },
    );
    expect(screen.getAllByText('Sozlamalar').length).toBeGreaterThan(0);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Til' }), 'en');
    expect((await screen.findAllByText('Settings')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Sozlamalar')).not.toBeInTheDocument();

    const req = fetchMock.mock.calls.at(0)?.at(0) as unknown as Request | undefined;
    expect(req?.url).toMatch(/\/users\/me$/);
    expect(req?.method).toBe('PATCH');
  });

  it('uz/en/ru tarjima kalitlari bir xil', () => {
    expect(keys(en).sort()).toEqual(keys(uz).sort());
    expect(keys(ru).sort()).toEqual(keys(uz).sort());
  });
});

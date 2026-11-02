import type { ProductDto } from '@savdo/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Layout } from '@/components/Layout';
import { ProductsPage } from '@/pages/ProductsPage';
import { PurchaseEditorPage } from '@/pages/PurchaseEditorPage';
import { mockApi } from './fetch-mock';
import { makeUser, renderWithStore } from './utils';

function product(overrides: Partial<ProductDto> = {}): ProductDto {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    sku: 'A-1',
    barcode: '',
    name: 'Kabel',
    unit: 'm',
    categoryId: null,
    salePrice: 12_100,
    priceManual: false,
    minStock: 0,
    stock: 7.5,
    isLow: false,
    imageUrl: null,
    isActive: true,
    ...overrides,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('menyu (2-bosqich)', () => {
  it('SOTUVCHI "Kirim" menyusini ko`rmaydi, OMBORCHI ko`radi', () => {
    const { unmount } = renderWithStore(<Layout />, { user: makeUser({ role: 'SOTUVCHI' }) });
    expect(screen.queryByRole('link', { name: /Kirim/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Tovarlar/ }).length).toBeGreaterThan(0);
    unmount();
    renderWithStore(<Layout />, { user: makeUser({ role: 'OMBORCHI' }) });
    expect(screen.getAllByRole('link', { name: /Kirim/ }).length).toBeGreaterThan(0);
  });

  it('telefondagi pastki menyuda 5 tadan ko`p element yo`q', () => {
    renderWithStore(<Layout />, { user: makeUser({ role: 'OWNER' }) });
    const bottom = screen.getByRole('navigation', { name: 'bottom' });
    expect(within(bottom).getAllByRole('link').length).toBeLessThanOrEqual(5);
  });
});

describe('tovarlar ro`yxati', () => {
  it("SOTUVCHI tannarxni ko'rmaydi", async () => {
    // API SOTUVCHI'ga avgCost yubormaydi
    mockApi({ '/products': [product()], '/categories': [] });
    renderWithStore(<ProductsPage />, { user: makeUser({ role: 'SOTUVCHI' }) });
    expect(await screen.findByText('Kabel')).toBeInTheDocument();
    expect(screen.queryByText(/Tannarx/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Tovar qo'shish/ })).not.toBeInTheDocument();
  });

  it("OWNER tannarx va qo'shish tugmasini ko'radi", async () => {
    mockApi({ '/products': [product({ avgCost: 11_000 })], '/categories': [] });
    renderWithStore(<ProductsPage />, { user: makeUser({ role: 'OWNER' }) });
    expect(await screen.findByText(/Tannarx/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tovar qo'shish/ })).toBeInTheDocument();
  });
});

describe('kirim formasi', () => {
  it('tannarx hisobi: xarajat qatorlarga taqsimlanadi', async () => {
    const a = product({ id: '11111111-1111-4111-8111-111111111111', name: 'Kabel', sku: 'K1' });
    const b = product({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Rozetka',
      sku: 'R1',
      unit: 'dona',
    });
    mockApi({ '/products': [a, b], '/suppliers': [] });
    renderWithStore(
      <Routes>
        <Route path="/purchases/new" element={<PurchaseEditorPage />} />
      </Routes>,
      { user: makeUser({ role: 'BUXGALTER' }), route: '/purchases/new' },
    );
    const user = userEvent.setup();
    const picker = await screen.findByRole('textbox', { name: /Tovar qidirib/ });

    await user.type(picker, 'Kabel');
    await user.click(await screen.findByRole('button', { name: /Kabel/ }));
    await user.type(picker, 'Rozetka');
    await user.click(await screen.findByRole('button', { name: /Rozetka/ }));

    const qty = screen.getAllByLabelText(/Miqdor/);
    const price = screen.getAllByLabelText('Xarid narxi');
    await user.clear(qty[0]!);
    await user.type(qty[0]!, '10');
    await user.type(price[0]!, '100000');
    await user.clear(qty[1]!);
    await user.type(qty[1]!, '5');
    await user.type(price[1]!, '200000');

    await user.click(screen.getByRole('button', { name: /Xarajat qo'shish/ }));
    await user.type(screen.getByRole('textbox', { name: 'Nomi' }), 'Logistika');
    const amount = screen.getByRole('spinbutton', { name: 'Summa' });
    await user.clear(amount);
    await user.type(amount, '100000');

    const norm = (s: string | null) => (s ?? '').replace(/\s/g, ' ');
    expect(norm(screen.getByTestId('landed-0').textContent)).toMatch(/50 000.*105 000/);
    expect(norm(screen.getByTestId('landed-1').textContent)).toMatch(/50 000.*210 000/);
    expect(norm(screen.getByTestId('purchase-total').textContent)).toMatch(/2 100 000/);
  });

  it("OMBORCHI narx va xarajat maydonlarini ko'rmaydi", async () => {
    mockApi({ '/products': [product()], '/suppliers': [] });
    renderWithStore(
      <Routes>
        <Route path="/purchases/new" element={<PurchaseEditorPage />} />
      </Routes>,
      { user: makeUser({ role: 'OMBORCHI' }), route: '/purchases/new' },
    );
    const user = userEvent.setup();
    await user.type(await screen.findByRole('textbox', { name: /Tovar qidirib/ }), 'Kab');
    await user.click(await screen.findByRole('button', { name: /Kabel/ }));
    expect(screen.getByLabelText(/Miqdor/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Xarid narxi')).not.toBeInTheDocument();
    expect(screen.queryByText(/Qo'shimcha xarajatlar/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tasdiqlash/ })).not.toBeInTheDocument();
  });
});

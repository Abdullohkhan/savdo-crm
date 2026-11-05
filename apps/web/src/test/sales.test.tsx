import type { OrderDto, OrderLineDto, ProductDto, Role } from '@savdo/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mobileNav } from '@/components/nav';
import { MenuPage } from '@/pages/MenuPage';
import { OrderEditorPage } from '@/pages/OrderEditorPage';
import { OrderPage } from '@/pages/OrderPage';
import { mockApi } from './fetch-mock';
import { makeUser, renderWithStore } from './utils';

const ORDER_ID = '33333333-3333-4333-8333-333333333333';

function line(overrides: Partial<OrderLineDto> = {}): OrderLineDto {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    productId: '11111111-1111-4111-8111-111111111111',
    productName: 'Kabel',
    sku: 'K1',
    unit: 'dona',
    quantity: 2,
    listPrice: 1100,
    price: 1100,
    total: 2200,
    picked: false,
    belowCost: false,
    ...overrides,
  };
}

function order(overrides: Partial<OrderDto> = {}): OrderDto {
  return {
    id: ORDER_ID,
    number: 7,
    status: 'QORALAMA',
    customerId: '55555555-5555-4555-8555-555555555555',
    customerName: 'Mijoz MCHJ',
    sellerId: 'u1',
    sellerName: 'Ali',
    note: '',
    total: 2200,
    advancePercent: 30,
    advanceRequired: 660,
    paidConfirmed: 0,
    paidPending: 0,
    needsPriceApproval: false,
    priceApproved: false,
    cancelReason: null,
    createdAt: new Date(0).toISOString(),
    lines: [line()],
    history: [],
    payments: [],
    debt: null,
    ...overrides,
  };
}

function renderOrder(o: OrderDto, role: Role) {
  mockApi({ [`/orders/${ORDER_ID}`]: o, [`/orders/${ORDER_ID}/shortages`]: [] });
  return renderWithStore(
    <Routes>
      <Route path="/orders/:id" element={<OrderPage />} />
    </Routes>,
    { user: makeUser({ role }), route: `/orders/${ORDER_ID}` },
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('menyu (3-bosqich)', () => {
  it('telefonda 4 ta asosiy + "Menyu", qolganlari Menyu sahifasida', () => {
    const { bottom, rest } = mobileNav('SOTUVCHI');
    expect(bottom.map((i) => i.to)).toEqual(['/', '/orders', '/customers', '/products', '/menu']);
    expect(rest.map((i) => i.to)).toEqual(['/payments', '/documents', '/settings']);
    expect(mobileNav('OMBORCHI').bottom.map((i) => i.to)).toEqual([
      '/',
      '/orders',
      '/products',
      '/purchases',
      '/menu',
    ]);
    renderWithStore(<MenuPage />, { user: makeUser({ role: 'SOTUVCHI' }) });
    expect(screen.getByRole('link', { name: "To'lovlar" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chiqish' })).toBeInTheDocument();
  });
});

describe('buyurtma sahifasi: rolga qarab amallar', () => {
  it('tannarxdan past narx: SOTUVCHI tasdiqlay olmaydi, OWNER ruxsat beradi', async () => {
    const o = order({
      needsPriceApproval: true,
      lines: [line({ price: 900, total: 1800, belowCost: true })],
    });
    const { unmount } = renderOrder(o, 'SOTUVCHI');
    expect(await screen.findByText(/egasining ruxsati kerak/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tasdiqlash' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Narxlarga ruxsat/ })).not.toBeInTheDocument();
    unmount();

    renderOrder(o, 'OWNER');
    expect(await screen.findByRole('button', { name: /Narxlarga ruxsat/ })).toBeInTheDocument();
  });

  it("YIG'ILMOQDA: OMBORCHI yig'adi va jo'natadi, SOTUVCHI — yo'q", async () => {
    const o = order({ status: 'YIGILMOQDA' });
    const { unmount } = renderOrder(o, 'OMBORCHI');
    expect(await screen.findByRole('checkbox', { name: /Kabel yig'ildi/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Jo'natish" })).toBeDisabled();
    expect(screen.queryByText("To'lov qabul qilish")).not.toBeInTheDocument();
    unmount();

    renderOrder(o, 'SOTUVCHI');
    await screen.findByText('Kabel');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Jo'natish" })).not.toBeInTheDocument();
    expect(screen.getAllByText("To'lov qabul qilish").length).toBeGreaterThan(0);
  });

  it("to'lov tasdiqlash tugmasi faqat BUXGALTER/OWNER'da; foyda faqat ular uchun", async () => {
    const pay = {
      id: 'p1',
      orderId: ORDER_ID,
      orderNumber: 7,
      customerName: 'Mijoz MCHJ',
      method: 'NAQD' as const,
      amount: 660,
      isAdvance: true,
      status: 'KUTILMOQDA' as const,
      note: '',
      receivedByName: 'Ali',
      confirmedByName: null,
      rejectReason: null,
      createdAt: new Date(0).toISOString(),
    };
    const base = order({ status: 'AVANS_KUTILMOQDA', payments: [pay], paidPending: 660 });
    const { unmount } = renderOrder(base, 'SOTUVCHI');
    await screen.findByText('Kabel');
    expect(screen.queryByRole('button', { name: 'Tasdiqlash' })).not.toBeInTheDocument();
    expect(screen.queryByText('Foyda')).not.toBeInTheDocument();
    unmount();

    renderOrder({ ...base, costTotal: 2000, profit: 200 }, 'BUXGALTER');
    expect(await screen.findByRole('button', { name: 'Tasdiqlash' })).toBeInTheDocument();
    expect(screen.getByText('Foyda')).toBeInTheDocument();
  });

  it("jo'natilgan buyurtmani faqat OWNER bekor qila oladi", async () => {
    const o = order({ status: 'JONATILDI', paidConfirmed: 2200 });
    const { unmount } = renderOrder(o, 'SOTUVCHI');
    await screen.findByText('Kabel');
    expect(screen.getByRole('button', { name: 'Yakunlash' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /bekor qilish/ })).not.toBeInTheDocument();
    unmount();
    renderOrder(o, 'OWNER');
    expect(
      await screen.findByRole('button', { name: /Buyurtmani bekor qilish/ }),
    ).toBeInTheDocument();
  });
});

describe('buyurtma formasi', () => {
  it("jami va chegirma to'g'ri hisoblanadi", async () => {
    const p: ProductDto = {
      id: '11111111-1111-4111-8111-111111111111',
      sku: 'K1',
      barcode: '',
      name: 'Kabel',
      unit: 'kg',
      categoryId: null,
      salePrice: 10_000,
      priceManual: false,
      minStock: 0,
      stock: 100,
      isLow: false,
      imageUrl: null,
      isActive: true,
    };
    mockApi({ '/products': [p], '/customers': [] });
    renderWithStore(
      <Routes>
        <Route path="/orders/new" element={<OrderEditorPage />} />
      </Routes>,
      { user: makeUser({ role: 'SOTUVCHI' }), route: '/orders/new' },
    );
    const user = userEvent.setup();
    await user.type(await screen.findByRole('textbox', { name: /Tovar qidirib/ }), 'Kab');
    await user.click(await screen.findByRole('button', { name: /Kabel/ }));

    const qty = screen.getByLabelText('Miqdor');
    await user.clear(qty);
    await user.type(qty, '2.5');
    const price = screen.getByLabelText('Sotuv narxi');
    await user.clear(price);
    await user.type(price, '9000');

    const norm = (s: string | null) => (s ?? '').replace(/\s/g, ' ');
    const lineText = norm(screen.getByTestId('order-line-0').textContent);
    expect(lineText).toMatch(/22 500/);
    expect(lineText).toMatch(/chegirma 10%/);
    expect(norm(screen.getByTestId('order-total').textContent)).toMatch(/22 500/);
    expect(within(screen.getByTestId('order-total')).queryByText(/NaN/)).toBeNull();
  });
});

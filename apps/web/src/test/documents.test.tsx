import type { DocumentDto, NotificationDto, OrderDto, Role } from '@savdo/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentsBlock } from '@/components/DocumentsBlock';
import { NotificationBell } from '@/components/NotificationBell';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { mockApi } from './fetch-mock';
import { makeUser, renderWithStore } from './utils';

const ORDER_ID = '33333333-3333-4333-8333-333333333333';

function doc(type: DocumentDto['type'], overrides: Partial<DocumentDto> = {}): DocumentDto {
  return {
    id: `doc-${type}`,
    type,
    number: `${type}-2026-0001`,
    status: 'YARATILDI',
    locale: 'uz',
    orderId: ORDER_ID,
    orderNumber: 7,
    customerName: 'Mijoz MCHJ',
    templateVersion: 1,
    createdByName: 'Ali',
    createdAt: new Date(0).toISOString(),
    signedAt: null,
    signedByName: null,
    ...overrides,
  };
}

const order = { id: ORDER_ID, status: 'JONATILDI' } as OrderDto;

afterEach(() => vi.unstubAllGlobals());

describe('qo`ng`iroqcha', () => {
  it('o`qilmaganlar sonini ko`rsatadi', async () => {
    mockApi({ '/notifications/unread-count': { count: 3 } });
    renderWithStore(<NotificationBell />, { user: makeUser() });
    expect(await screen.findByTestId('unread-count')).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: /3 ta o‘qilmagan/ })).toHaveAttribute(
      'href',
      '/notifications',
    );
  });

  it('0 bo`lsa belgi yo`q, 100+ → 99+', async () => {
    mockApi({ '/notifications/unread-count': { count: 0 } });
    const { unmount } = renderWithStore(<NotificationBell />, { user: makeUser() });
    await screen.findByRole('link', { name: /0 ta/ });
    expect(screen.queryByTestId('unread-count')).not.toBeInTheDocument();
    unmount();
    vi.unstubAllGlobals();
    mockApi({ '/notifications/unread-count': { count: 150 } });
    renderWithStore(<NotificationBell />, { user: makeUser() });
    expect(await screen.findByTestId('unread-count')).toHaveTextContent('99+');
  });
});

describe('bildirishnomalar sahifasi', () => {
  it('matn parametrlar bilan, "hammasini o`qildi"', async () => {
    const n: NotificationDto = {
      id: 'n1',
      type: 'ORDER_AWAITING_ADVANCE',
      params: { orderNumber: 7, customerName: 'Mijoz MCHJ', advance: '660' },
      entity: 'ORDER',
      entityId: ORDER_ID,
      readAt: null,
      createdAt: new Date(0).toISOString(),
    };
    const fetchMock = mockApi({
      '/notifications': [n],
      'POST /notifications/read-all': { count: 0 },
    });
    renderWithStore(<NotificationsPage />, { user: makeUser({ role: 'BUXGALTER' }) });
    expect(
      await screen.findByText('Buyurtma #7 (Mijoz MCHJ) avans kutmoqda: 660 so‘m'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hammasini o‘qildi' }));
    const posted = fetchMock.mock.calls
      .map((c) => c.at(0) as unknown as Request)
      .some((r) => r.method === 'POST' && r.url.endsWith('/notifications/read-all'));
    expect(posted).toBe(true);
  });
});

describe('hujjatlar bloki rolga qarab', () => {
  function setup(role: Role, docs: DocumentDto[]) {
    const fetchMock = mockApi({
      [`/orders/${ORDER_ID}/documents`]: docs,
      'POST /documents/doc-AKT/sign': { ...doc('AKT'), status: 'IMZOLANDI' },
    });
    renderWithStore(<DocumentsBlock order={order} />, { user: makeUser({ role }) });
    return fetchMock;
  }

  it('SOTUVCHI: aktni "imzolandi" belgilaydi, qayta yaratish tugmalari bor', async () => {
    const fetchMock = setup('SOTUVCHI', [doc('AKT'), doc('YUK_XATI'), doc('SHARTNOMA')]);
    expect(await screen.findByText('Akt · AKT-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Akt imzolangan bo‘lishi kerak', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aktni qayta yaratish/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Imzolandi' }));
    const signed = fetchMock.mock.calls
      .map((c) => c.at(0) as unknown as Request)
      .some((r) => r.method === 'POST' && r.url.endsWith('/documents/doc-AKT/sign'));
    expect(signed).toBe(true);
    // Imzolash tugmasi faqat aktda
    expect(screen.getAllByRole('button', { name: 'Imzolandi' })).toHaveLength(1);
  });

  it('OMBORCHI: faqat ko`radi — imzolash va qayta yaratish yo`q', async () => {
    setup('OMBORCHI', [doc('YUK_XATI')]);
    expect(await screen.findByText('Yuk xati · YUK_XATI-2026-0001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF ko‘rish' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Imzolandi' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /qayta yaratish/ })).not.toBeInTheDocument();
  });

  it('imzolangan akt — badge, tugma yo`q; bekorlar alohida', async () => {
    setup('BUXGALTER', [
      doc('AKT', {
        status: 'IMZOLANDI',
        signedAt: new Date(0).toISOString(),
        signedByName: 'Vali',
      }),
      doc('SHARTNOMA', { id: 'old', status: 'BEKOR' }),
    ]);
    expect(await screen.findByText(/imzoladi: Vali/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Imzolandi' })).not.toBeInTheDocument();
    expect(screen.getByText('Bekor qilinganlar: 1')).toBeInTheDocument();
  });
});

import type { UserDto } from '@savdo/shared';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import i18n from '@/i18n';
import { makeStore, type RootState } from '@/store';

export function makeUser(overrides: Partial<UserDto> = {}): UserDto {
  return {
    id: 'u1',
    organizationId: 'o1',
    name: 'Ali',
    phone: '+998901234567',
    role: 'OWNER',
    isActive: true,
    locale: 'uz',
    telegramLinked: false,
    createdAt: new Date(0).toISOString(),
    ...overrides,
  };
}

export function renderWithStore(
  ui: ReactElement,
  { user, route = '/' }: { user?: UserDto; route?: string } = {},
) {
  void i18n.changeLanguage('uz');
  const preloaded: Partial<RootState> = user
    ? { auth: { accessToken: 'test', user, initialized: true } }
    : {};
  const store = makeStore(preloaded);
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </Provider>,
    ),
  };
}

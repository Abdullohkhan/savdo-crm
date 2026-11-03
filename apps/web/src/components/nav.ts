import { CUSTOMER_ROLES, PAYMENT_RECEIVE_ROLES, PURCHASE_DRAFT_ROLES, Role } from '@savdo/shared';
import {
  ClipboardList,
  Contact,
  Home,
  type LucideIcon,
  Menu,
  Package,
  Settings,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  roles?: readonly Role[];
}

/** Tartib = muhimlik: telefonda birinchi 4 tasi pastki menyuda */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: Home },
  { to: '/orders', labelKey: 'nav.orders', icon: ClipboardList },
  { to: '/customers', labelKey: 'nav.customers', icon: Contact, roles: CUSTOMER_ROLES },
  { to: '/products', labelKey: 'nav.products', icon: Package },
  { to: '/purchases', labelKey: 'nav.purchases', icon: Truck, roles: PURCHASE_DRAFT_ROLES },
  { to: '/payments', labelKey: 'nav.payments', icon: Wallet, roles: PAYMENT_RECEIVE_ROLES },
  { to: '/users', labelKey: 'nav.users', icon: Users, roles: [Role.OWNER] },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export const MENU_ITEM: NavItem = { to: '/menu', labelKey: 'nav.menu', icon: Menu };

export function visibleNav(role: Role | undefined): NavItem[] {
  return NAV_ITEMS.filter((i) => !i.roles || (role !== undefined && i.roles.includes(role)));
}

/** Telefon: 5 tagacha bo'lsa hammasi, aks holda 4 ta + "Menyu" */
export function mobileNav(role: Role | undefined): { bottom: NavItem[]; rest: NavItem[] } {
  const all = visibleNav(role);
  if (all.length <= 5) return { bottom: all, rest: [] };
  return { bottom: [...all.slice(0, 4), MENU_ITEM], rest: all.slice(4) };
}

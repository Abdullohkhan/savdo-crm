import { PURCHASE_DRAFT_ROLES, Role } from '@savdo/shared';
import { Home, type LucideIcon, Package, Settings, Truck, Users } from 'lucide-react';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  roles?: readonly Role[];
}

/** Telefonda pastki menyuda 5 tadan ko'p bo'lmasin */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: Home },
  { to: '/products', labelKey: 'nav.products', icon: Package },
  { to: '/purchases', labelKey: 'nav.purchases', icon: Truck, roles: PURCHASE_DRAFT_ROLES },
  { to: '/users', labelKey: 'nav.users', icon: Users, roles: [Role.OWNER] },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function visibleNav(role: Role | undefined): NavItem[] {
  return NAV_ITEMS.filter((i) => !i.roles || (role !== undefined && i.roles.includes(role)));
}

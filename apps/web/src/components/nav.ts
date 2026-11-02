import { Role } from '@savdo/shared';
import { Home, type LucideIcon, Settings, Users } from 'lucide-react';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: Home },
  { to: '/users', labelKey: 'nav.users', icon: Users, roles: [Role.OWNER] },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function visibleNav(role: Role | undefined): NavItem[] {
  return NAV_ITEMS.filter((i) => !i.roles || (role !== undefined && i.roles.includes(role)));
}

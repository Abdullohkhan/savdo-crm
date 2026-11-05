import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';
import { cn } from '@/lib/utils';
import { useLogoutMutation } from '@/store/api';
import { useAppSelector } from '@/store';
import { mobileNav, visibleNav } from './nav';
import { NotificationBell } from './NotificationBell';
import { LanguageSwitcher, ThemeSwitcher } from './Switchers';
import { Button } from './ui/button';

export function Layout() {
  const { t } = useTranslation();
  const role = useAppSelector((s) => s.auth.user?.role);
  const items = visibleNav(role);
  const { bottom } = mobileNav(role);
  const [logout] = useLogoutMutation();

  return (
    <div className="min-h-dvh md:flex">
      {/* Kompyuterda yon panel */}
      <aside className="hidden w-56 shrink-0 border-r p-3 md:flex md:flex-col">
        <div className="px-3 py-2 text-lg font-semibold">{t('app.name')}</div>
        <nav aria-label="main" className="mt-2 flex flex-col gap-1">
          {items.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent',
                  isActive && 'bg-accent font-medium',
                )
              }
            >
              <Icon className="size-4" />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        <Button variant="ghost" className="mt-auto justify-start" onClick={() => void logout()}>
          <LogOut />
          {t('nav.logout')}
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur">
          <span className="min-w-0 truncate font-semibold md:hidden">{t('app.name')}</span>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <NotificationBell />
            <ThemeSwitcher className="h-9 w-auto px-2 text-sm" />
            <LanguageSwitcher className="h-9 w-auto px-2 text-sm" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 p-4 pb-24 md:pb-4">
          <Outlet />
        </main>
      </div>

      {/* Telefonda pastki navigatsiya */}
      <nav
        aria-label="bottom"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {bottom.map(({ to, labelKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground',
                isActive && 'text-primary',
              )
            }
          >
            <Icon className="size-5" />
            <span className="w-full truncate text-center">{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

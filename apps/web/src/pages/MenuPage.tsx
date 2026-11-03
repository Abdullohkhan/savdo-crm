import { ChevronRight, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PageHeader } from '@/components/common';
import { mobileNav } from '@/components/nav';
import { useAppSelector } from '@/store';
import { useLogoutMutation } from '@/store/api';

/** Telefonda pastki menyuga sig'magan bo'limlar */
export function MenuPage() {
  const { t } = useTranslation();
  const role = useAppSelector((s) => s.auth.user?.role);
  const { rest } = mobileNav(role);
  const [logout] = useLogoutMutation();
  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title={t('nav.menu')} />
      <ul className="divide-y rounded-lg border">
        {rest.map(({ to, labelKey, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-3 p-3 hover:bg-accent">
              <Icon className="size-5 text-muted-foreground" />
              <span className="flex-1">{t(labelKey)}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent"
          >
            <LogOut className="size-5 text-muted-foreground" />
            <span className="flex-1">{t('nav.logout')}</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

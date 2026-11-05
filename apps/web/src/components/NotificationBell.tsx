import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useUnreadCountQuery } from '@/store/api';

/** O'qilmaganlar soni har 30 s yangilanadi (polling) */
export const NOTIFICATION_POLL_MS = 30_000;

export function NotificationBell() {
  const { t } = useTranslation();
  const { data } = useUnreadCountQuery(undefined, {
    pollingInterval: NOTIFICATION_POLL_MS,
    refetchOnFocus: true,
  });
  const count = data?.count ?? 0;
  return (
    <Link
      to="/notifications"
      className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-accent"
      aria-label={t('notifications.bell', { count })}
    >
      <Bell className="size-5" />
      {count > 0 && (
        <span
          data-testid="unread-count"
          className="absolute -right-0.5 -top-0.5 min-w-[1.1rem] rounded-full bg-destructive px-1 text-center text-[10px] font-semibold leading-[1.1rem] text-white"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

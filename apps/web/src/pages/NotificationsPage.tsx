import type { NotificationDto } from '@savdo/shared';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ErrorText, PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  useNotificationsQuery,
  useReadAllNotificationsMutation,
  useReadNotificationMutation,
} from '@/store/api';

export function notificationLink(n: Pick<NotificationDto, 'entity' | 'entityId'>): string {
  if (n.entity === 'ORDER' && n.entityId) return `/orders/${n.entityId}`;
  if (n.entity === 'PAYMENT') return '/payments';
  if (n.entity === 'PRODUCT') return '/products?low=1';
  return '/';
}

export function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    data = [],
    isLoading,
    error,
  } = useNotificationsQuery(undefined, {
    pollingInterval: 30_000,
  });
  const [read] = useReadNotificationMutation();
  const [readAll, readAllState] = useReadAllNotificationsMutation();
  const unread = data.filter((n) => !n.readAt).length;

  const open = (n: NotificationDto) => {
    if (!n.readAt) void read(n.id);
    void navigate(notificationLink(n));
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader
        title={t('notifications.title')}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void readAll()}
            disabled={unread === 0 || readAllState.isLoading}
          >
            {t('notifications.readAll')}
          </Button>
        }
      />
      <ErrorText error={error} />
      {isLoading ? (
        <p className="text-muted-foreground">{t('app.loading')}</p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground">{t('notifications.empty')}</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {data.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => open(n)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-accent',
                      !n.readAt && 'bg-primary/5',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 size-2 shrink-0 rounded-full',
                        n.readAt ? 'bg-transparent' : 'bg-primary',
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block break-words', !n.readAt && 'font-medium')}>
                        {t(`notifications.types.${n.type}`, n.params)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(n.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

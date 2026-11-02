import type { PurchaseStatus } from '@savdo/shared';
import { useTranslation } from 'react-i18next';
import { Badge } from './common';

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  const { t } = useTranslation();
  const tone = status === 'TASDIQLANGAN' ? 'ok' : status === 'BEKOR' ? 'danger' : 'muted';
  return <Badge tone={tone}>{t(`purchaseStatus.${status}`)}</Badge>;
}

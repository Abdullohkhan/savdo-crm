import {
  canSeeDocumentType,
  type DocumentDto,
  DOCUMENT_SIGN_ROLES,
  type DocumentType,
  type OrderDto,
  type Role,
} from '@savdo/shared';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { openBlobUrl } from '@/lib/pdf';
import { formatDate } from '@/lib/format';
import { useAppSelector } from '@/store';
import {
  useDocumentPdfMutation,
  useOrderDocumentsQuery,
  useRegenerateDocumentMutation,
  useSignDocumentMutation,
} from '@/store/api';
import { Badge, ErrorText } from './common';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

/** Qaysi bosqichda qaysi hujjatni qayta yaratish mumkin (API bilan bir xil) */
const REGEN_STATUS: Record<DocumentType, OrderDto['status'][]> = {
  SHARTNOMA: ['TASDIQLANGAN', 'AVANS_KUTILMOQDA', 'YIGILMOQDA', 'JONATILDI'],
  HISOB_FAKTURA: ['JONATILDI', 'YAKUNLANDI'],
  YUK_XATI: ['JONATILDI'],
  AKT: ['JONATILDI'],
};

export function DocumentStatusBadge({ status }: { status: DocumentDto['status'] }) {
  const { t } = useTranslation();
  const tone = status === 'IMZOLANDI' ? 'ok' : status === 'BEKOR' ? 'danger' : 'muted';
  return <Badge tone={tone}>{t(`documents.status.${status}`)}</Badge>;
}

export function usePdf() {
  const [fetchPdf, state] = useDocumentPdfMutation();
  const open = async (d: Pick<DocumentDto, 'id' | 'number'>, download = false) => {
    const r = await fetchPdf(d.id);
    if ('data' in r && r.data) openBlobUrl(r.data, download ? `${d.number}.pdf` : undefined);
  };
  return { open, state };
}

export function DocumentRow({ doc, role }: { doc: DocumentDto; role: Role | undefined }) {
  const { t } = useTranslation();
  const { open, state } = usePdf();
  const [sign, signState] = useSignDocumentMutation();
  const canSign = !!role && DOCUMENT_SIGN_ROLES.includes(role) && doc.status === 'YARATILDI';
  return (
    <li className="grid gap-2 py-2" data-testid={`doc-${doc.type}`}>
      <div className="flex flex-wrap items-center gap-2">
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium">
          {t(`documents.types.${doc.type}`)} · {doc.number}
        </span>
        <DocumentStatusBadge status={doc.status} />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatDate(doc.createdAt)}
        {doc.signedAt && ` · ${t('documents.signedBy', { name: doc.signedByName })}`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void open(doc)}
          disabled={state.isLoading}
        >
          {t('documents.view')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-label={t('documents.download')}
          onClick={() => void open(doc, true)}
          disabled={state.isLoading}
        >
          <Download />
        </Button>
        {canSign && doc.type === 'AKT' && (
          <Button size="sm" onClick={() => void sign(doc.id)} disabled={signState.isLoading}>
            {t('documents.markSigned')}
          </Button>
        )}
      </div>
      <ErrorText error={state.error ?? signState.error} />
    </li>
  );
}

export function DocumentsBlock({ order }: { order: OrderDto }) {
  const { t } = useTranslation();
  const role = useAppSelector((s) => s.auth.user?.role);
  const { data: docs = [], isLoading } = useOrderDocumentsQuery(order.id);
  const [regen, regenState] = useRegenerateDocumentMutation();
  const canRegen = !!role && DOCUMENT_SIGN_ROLES.includes(role);
  const active = docs.filter((d) => d.status !== 'BEKOR');
  const cancelled = docs.filter((d) => d.status === 'BEKOR');
  const regenTypes = (Object.keys(REGEN_STATUS) as DocumentType[]).filter(
    (ty) => REGEN_STATUS[ty].includes(order.status) && canSeeDocumentType(role, ty),
  );

  if (!isLoading && docs.length === 0 && order.status === 'QORALAMA') return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('documents.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {isLoading ? (
          <p className="text-muted-foreground">{t('app.loading')}</p>
        ) : active.length === 0 ? (
          <p className="text-muted-foreground">{t('documents.empty')}</p>
        ) : (
          <ul className="divide-y">
            {active.map((d) => (
              <DocumentRow key={d.id} doc={d} role={role} />
            ))}
          </ul>
        )}
        {order.status === 'JONATILDI' &&
          active.some((d) => d.type === 'AKT' && d.status === 'YARATILDI') && (
            <p className="text-xs text-amber-700 dark:text-amber-300">{t('documents.actHint')}</p>
          )}
        {canRegen && regenTypes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {regenTypes.map((ty) => (
              <Button
                key={ty}
                size="sm"
                variant="ghost"
                onClick={() => void regen({ orderId: order.id, type: ty })}
                disabled={regenState.isLoading}
              >
                <RefreshCw />
                {t(`documents.regenerate.${ty}`)}
              </Button>
            ))}
          </div>
        )}
        <ErrorText error={regenState.error} />
        {cancelled.length > 0 && (
          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground">
              {t('documents.cancelledCount', { count: cancelled.length })}
            </summary>
            <ul className="divide-y">
              {cancelled.map((d) => (
                <DocumentRow key={d.id} doc={d} role={role} />
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

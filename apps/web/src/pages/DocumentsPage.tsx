import { DOCUMENT_TYPES, type DocumentType, Role } from '@savdo/shared';
import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { Badge, ErrorText, PageHeader } from '@/components/common';
import { DocumentStatusBadge, usePdf } from '@/components/DocumentsBlock';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store';
import { useDocumentsQuery, useTemplatesQuery } from '@/store/api';

export function DocumentsPage() {
  const { t } = useTranslation();
  const isOwner = useAppSelector((s) => s.auth.user?.role === Role.OWNER);
  const [params, setParams] = useSearchParams();
  const tab = isOwner && params.get('tab') === 'templates' ? 'templates' : 'documents';
  const setTab = (v: string) => {
    const p = new URLSearchParams(params);
    if (v === 'documents') p.delete('tab');
    else p.set('tab', v);
    setParams(p, { replace: true });
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title={t('documents.title')} />
      {isOwner && (
        <div className="flex gap-1 rounded-md bg-muted p-1 text-sm" role="tablist">
          {(['documents', 'templates'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={tab === v}
              onClick={() => setTab(v)}
              className={cn(
                'flex-1 rounded px-3 py-1.5',
                tab === v ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground',
              )}
            >
              {t(`documents.tab.${v}`)}
            </button>
          ))}
        </div>
      )}
      {tab === 'templates' ? <TemplatesList /> : <DocumentsList />}
    </div>
  );
}

function DocumentsList() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const type = (DOCUMENT_TYPES as readonly string[]).includes(params.get('type') ?? '')
    ? (params.get('type') as DocumentType)
    : undefined;
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const {
    data = [],
    isLoading,
    error,
  } = useDocumentsQuery({
    type,
    from: from || undefined,
    to: to || undefined,
  });
  const { open, state } = usePdf();
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor="d-type">{t('documents.type')}</Label>
          <Select id="d-type" value={type ?? ''} onChange={(e) => set('type', e.target.value)}>
            <option value="">{t('common.all')}</option>
            {DOCUMENT_TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {t(`documents.types.${ty}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="d-from">{t('documents.from')}</Label>
          <Input
            id="d-from"
            type="date"
            value={from}
            onChange={(e) => set('from', e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="d-to">{t('documents.to')}</Label>
          <Input id="d-to" type="date" value={to} onChange={(e) => set('to', e.target.value)} />
        </div>
      </div>
      <ErrorText error={error ?? state.error} />
      {isLoading ? (
        <p className="text-muted-foreground">{t('app.loading')}</p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground">{t('documents.empty')}</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y text-sm">
              {data.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {t(`documents.types.${d.type}`)} · {d.number}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <Link className="underline" to={`/orders/${d.orderId}`}>
                        {t('orders.numberShort', { number: d.orderNumber })}
                      </Link>{' '}
                      · {d.customerName} · {formatDate(d.createdAt)}
                    </p>
                  </div>
                  <DocumentStatusBadge status={d.status} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void open(d)}
                    disabled={state.isLoading}
                  >
                    PDF
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function TemplatesList() {
  const { t } = useTranslation();
  const { data = [], isLoading, error } = useTemplatesQuery();
  if (isLoading) return <p className="text-muted-foreground">{t('app.loading')}</p>;
  return (
    <>
      <ErrorText error={error} />
      <div className="flex justify-end">
        <Button asChild size="sm" variant="outline">
          <Link to="/documents/templates/new">{t('templates.new')}</Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y text-sm">
            {data.map((tpl) => (
              <li key={tpl.id} className="flex items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`documents.types.${tpl.type}`)} · {tpl.locale.toUpperCase()} · v{tpl.version}
                  </p>
                </div>
                {tpl.isDefault && <Badge tone="ok">{t('templates.default')}</Badge>}
                <Button asChild size="sm" variant="ghost" aria-label={t('common.edit')}>
                  <Link to={`/documents/templates/${tpl.id}`}>
                    <Pencil />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

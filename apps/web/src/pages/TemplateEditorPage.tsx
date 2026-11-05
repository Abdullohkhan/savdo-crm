import {
  DOC_LOCALES,
  type DocLocale,
  DOCUMENT_TYPES,
  type DocumentTemplateDto,
  type DocumentType,
  TEMPLATE_VARIABLES,
} from '@savdo/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ErrorText, PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  useCreateTemplateMutation,
  usePreviewTemplateMutation,
  useTemplateQuery,
  useUpdateTemplateMutation,
} from '@/store/api';

export function TemplateEditorPage() {
  const { id = 'new' } = useParams();
  const isNew = id === 'new';
  const { t } = useTranslation();
  const { data, isLoading, error } = useTemplateQuery(id, { skip: isNew });
  if (!isNew && isLoading) return <p className="text-muted-foreground">{t('app.loading')}</p>;
  if (!isNew && !data) return <ErrorText error={error} />;
  return <Editor key={data?.id ?? 'new'} tpl={data} />;
}

function Editor({ tpl }: { tpl?: DocumentTemplateDto }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [type, setType] = useState<DocumentType>(tpl?.type ?? 'SHARTNOMA');
  const [locale, setLocale] = useState<DocLocale>(tpl?.locale ?? 'uz');
  const [name, setName] = useState(tpl?.name ?? '');
  const [html, setHtml] = useState(tpl?.html ?? '<h1 class="center">{{document.number}}</h1>\n');
  const [isDefault, setIsDefault] = useState(tpl?.isDefault ?? false);
  const [preview, previewState] = usePreviewTemplateMutation();
  const [create, createState] = useCreateTemplateMutation();
  const [update, updateState] = useUpdateTemplateMutation();
  const saving = createState.isLoading || updateState.isLoading;

  const save = async () => {
    if (tpl) {
      const r = await update({ id: tpl.id, body: { name, html, isDefault } });
      if ('data' in r) void navigate('/documents?tab=templates');
    } else {
      const r = await create({ type, locale, name, html, isDefault });
      if ('data' in r) void navigate('/documents?tab=templates');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader title={tpl ? `${tpl.name} · v${tpl.version}` : t('templates.new')} />
      <Card>
        <CardContent className="grid gap-3 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label htmlFor="t-type">{t('documents.type')}</Label>
              <Select
                id="t-type"
                value={type}
                disabled={!!tpl}
                onChange={(e) => setType(e.target.value as DocumentType)}
              >
                {DOCUMENT_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {t(`documents.types.${ty}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="t-locale">{t('language.label')}</Label>
              <Select
                id="t-locale"
                value={locale}
                disabled={!!tpl}
                onChange={(e) => setLocale(e.target.value as DocLocale)}
              >
                {DOC_LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {t(`language.${l}`)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="t-name">{t('templates.name')}</Label>
            <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="t-html">{t('templates.html')}</Label>
            <textarea
              id="t-html"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              spellCheck={false}
              rows={16}
              className="w-full rounded-md border bg-background p-2 font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              <code>{'{{customer.name}}'}</code> · {t('templates.htmlHint')}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={isDefault}
              disabled={tpl?.isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            {t('templates.makeDefault')}
          </label>
          <ErrorText error={createState.error ?? updateState.error ?? previewState.error} />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void preview({ type, locale, html })}
              disabled={previewState.isLoading}
            >
              {t('templates.preview')}
            </Button>
            <Button onClick={() => void save()} disabled={saving || !name.trim()}>
              {t('common.save')}
            </Button>
          </div>
          {tpl && <p className="text-xs text-muted-foreground">{t('templates.versionHint')}</p>}
        </CardContent>
      </Card>

      {previewState.data && (
        <Card>
          <CardHeader>
            <CardTitle>{t('templates.preview')}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* sandbox="" — skript ishlamaydi */}
            <iframe
              title={t('templates.preview')}
              sandbox=""
              srcDoc={`<!doctype html><meta charset="utf-8"><style>body{font:13px/1.4 system-ui,sans-serif;color:#111;background:#fff;margin:12px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #888;padding:3px 5px;text-align:left;vertical-align:top}table.plain td,table.plain th{border:0}.right{text-align:right}.center{text-align:center}h1{font-size:18px}h3{font-size:14px}</style>${previewState.data.html}`}
              className="h-[28rem] w-full rounded-md border bg-white"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('templates.variables')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-1 text-xs sm:grid-cols-2">
            {TEMPLATE_VARIABLES.map((v) => (
              <li key={v} className="break-words">
                <code className="rounded bg-muted px-1">
                  {v === 'lines' ? '{{#each lines}}…{{/each}}' : `{{${v.replace('lines.', '')}}}`}
                </code>{' '}
                <span className="text-muted-foreground">
                  {t(v === 'lines' ? 'templates.vars.lines._' : `templates.vars.${v}`)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

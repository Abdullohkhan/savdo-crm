import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { apiErrorKey } from '@/store/api';

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-semibold">{title}</h1>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {t(apiErrorKey(error))}
    </p>
  );
}

export function Badge({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'warn' | 'ok' | 'danger';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tone === 'muted' && 'bg-muted text-muted-foreground',
        tone === 'warn' && 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
        tone === 'ok' &&
          'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
        tone === 'danger' && 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200',
      )}
    >
      {children}
    </span>
  );
}

/** Toifalarni daraxt tartibida (chuqurlik bilan) qaytaradi */
export function sortTree<T extends { id: string; parentId: string | null; name: string }>(
  items: T[],
): { item: T; depth: number }[] {
  const children = new Map<string | null, T[]>();
  const ids = new Set(items.map((i) => i.id));
  for (const i of items) {
    const key = i.parentId && ids.has(i.parentId) ? i.parentId : null;
    children.set(key, [...(children.get(key) ?? []), i]);
  }
  const out: { item: T; depth: number }[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    for (const c of (children.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ item: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

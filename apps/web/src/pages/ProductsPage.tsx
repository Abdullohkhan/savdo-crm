import { CATALOG_EDIT_ROLES, canSeeCost } from '@savdo/shared';
import { FolderTree, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { CategorySelect } from '@/components/CategorySelect';
import { Badge, PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney, formatQty } from '@/lib/format';
import { useAppSelector } from '@/store';
import { useProductsQuery } from '@/store/api';

export function ProductsPage() {
  const { t } = useTranslation();
  const role = useAppSelector((s) => s.auth.user?.role);
  const canEdit = !!role && CATALOG_EDIT_ROLES.includes(role);
  const showCost = canSeeCost(role);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const categoryId = params.get('category') ?? '';
  const low = params.get('low') === '1';

  // Qidiruv — yozib bo'lgach (debounce)
  const [debounced, setDebounced] = useState(q);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(h);
  }, [q]);

  const { data: products = [], isFetching } = useProductsQuery({
    q: debounced || undefined,
    categoryId: categoryId || undefined,
    low,
  });

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader
        title={t('products.title')}
        actions={
          canEdit && (
            <>
              <Button asChild size="sm" variant="outline">
                <Link to="/categories">
                  <FolderTree />
                  {t('categories.title')}
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/products/new">
                  <Plus />
                  {t('products.add')}
                </Link>
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-2 sm:grid-cols-[1fr_200px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t('products.search')}
            placeholder={t('products.search')}
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <CategorySelect
          aria-label={t('products.category')}
          emptyLabel={t('products.allCategories')}
          value={categoryId}
          onChange={(e) => setParam('category', e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={low}
            onChange={(e) => setParam('low', e.target.checked ? '1' : '')}
          />
          {t('products.lowOnly')}
        </label>
      </div>

      {products.length === 0 ? (
        <p className="text-muted-foreground">
          {isFetching ? t('app.loading') : t('products.empty')}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                to={`/products/${p.id}`}
                className="flex items-center gap-3 p-3 hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {p.sku}
                    {showCost && p.avgCost !== undefined && (
                      <>
                        {' '}
                        · {t('products.avgCost')}: {formatMoney(p.avgCost)}
                      </>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium">{formatMoney(p.salePrice)}</p>
                  <p className="text-sm">
                    {p.isLow ? (
                      <Badge tone="warn">
                        {formatQty(p.stock)} {t(`units.${p.unit}`)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">
                        {formatQty(p.stock)} {t(`units.${p.unit}`)}
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

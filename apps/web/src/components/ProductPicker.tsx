import type { ProductDto } from '@savdo/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { formatMoney } from '@/lib/format';
import { Input } from './ui/input';

/** Nom, SKU yoki shtrix-kod bo'yicha qidirib tovar tanlash */
export function ProductPicker({
  products,
  onPick,
  showPrice = false,
}: {
  products: ProductDto[];
  onPick: (p: ProductDto) => void;
  showPrice?: boolean;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const matches = query
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.sku.toLowerCase().includes(query) ||
            p.barcode === q.trim(),
        )
        .slice(0, 8)
    : [];
  return (
    <div className="grid gap-1">
      <Input
        aria-label={t('purchases.addProduct')}
        placeholder={t('purchases.addProduct')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {matches.length > 0 && (
        <ul className="divide-y rounded-md border">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 p-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onPick(p);
                  setQ('');
                }}
              >
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {showPrice ? formatMoney(p.salePrice) : p.sku}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query && matches.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t('purchases.noProductFound')}{' '}
          <Link className="underline" to="/products/new">
            {t('products.add')}
          </Link>
        </p>
      )}
    </div>
  );
}

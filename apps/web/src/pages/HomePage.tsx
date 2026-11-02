import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatQty } from '@/lib/format';
import { useAppSelector } from '@/store';
import { useProductsQuery } from '@/store/api';

export function HomePage() {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return null;
  return (
    <div className="grid grid-cols-1 gap-4">
      <WelcomeCard name={user.name} role={user.role} />
      <LowStockCard />
    </div>
  );
}

function WelcomeCard({ name, role }: { name: string; role: string }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('home.welcome', { name })}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('home.role', { role: t(`roles.${role}`) })}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{t('home.placeholder')}</p>
      </CardContent>
    </Card>
  );
}

function LowStockCard() {
  const { t } = useTranslation();
  const { data = [] } = useProductsQuery({ low: true });
  if (data.length === 0) return null;
  return (
    <Card className="border-amber-300 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TriangleAlert className="size-5 text-amber-600 dark:text-amber-400" />
          {t('home.lowStock', { count: data.length })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">
          {data.slice(0, 5).map((p) => (
            <li key={p.id}>
              <Link
                to={`/products/${p.id}`}
                className="flex justify-between gap-2 py-2 hover:underline"
              >
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatQty(p.stock)} / {formatQty(p.minStock)} {t(`units.${p.unit}`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {data.length > 5 && (
          <Link to="/products?low=1" className="mt-2 inline-block text-sm underline">
            {t('home.showAll')}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

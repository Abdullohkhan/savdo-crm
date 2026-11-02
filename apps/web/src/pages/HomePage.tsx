import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppSelector } from '@/store';

export function HomePage() {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('home.welcome', { name: user.name })}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('home.role', { role: t(`roles.${user.role}`) })}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{t('home.placeholder')}</p>
      </CardContent>
    </Card>
  );
}

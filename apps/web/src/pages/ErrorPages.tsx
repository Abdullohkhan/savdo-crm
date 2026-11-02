import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

function Message({ code, titleKey }: { code: string; titleKey: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl font-bold text-muted-foreground">{code}</p>
      <h1 className="text-xl font-semibold">{t(titleKey)}</h1>
      <Button asChild variant="outline">
        <Link to="/">{t('common.back')}</Link>
      </Button>
    </div>
  );
}

export const NotFoundPage = () => <Message code="404" titleKey="errors.notFoundTitle" />;
export const ForbiddenPage = () => <Message code="403" titleKey="errors.forbiddenTitle" />;

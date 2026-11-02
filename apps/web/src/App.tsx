import { useTranslation } from 'react-i18next';
import { AppEffects } from './AppEffects';
import { AppRoutes } from './AppRoutes';
import { useAppSelector } from './store';

export function App() {
  const { t } = useTranslation();
  const initialized = useAppSelector((s) => s.auth.initialized);
  return (
    <>
      <AppEffects />
      {initialized ? (
        <AppRoutes />
      ) : (
        <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
          {t('app.loading')}
        </div>
      )}
    </>
  );
}

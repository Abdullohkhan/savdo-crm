import { zodResolver } from '@hookform/resolvers/zod';
import { type LoginInput, loginSchema } from '@savdo/shared';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router';
import { Field } from '@/components/Field';
import { LanguageSwitcher, ThemeSwitcher } from '@/components/Switchers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAppSelector } from '@/store';
import { apiErrorKey, useLoginMutation } from '@/store/api';

export function LoginPage() {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();
  const [login, { isLoading, error }] = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="flex min-h-dvh flex-col p-4">
      <div className="ml-auto flex gap-2">
        <ThemeSwitcher className="h-9 w-auto" />
        <LanguageSwitcher className="h-9 w-auto" />
      </div>
      <Card className="m-auto w-full max-w-sm">
        <CardHeader>
          <p className="text-sm text-muted-foreground">{t('app.name')}</p>
          <CardTitle>{t('auth.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-4"
            noValidate
            onSubmit={handleSubmit((v) => login(v).catch(() => undefined))}
          >
            <Field id="phone" label={t('auth.phone')} error={errors.phone?.message}>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="username"
                placeholder="+998901234567"
                {...register('phone')}
              />
            </Field>
            <Field id="password" label={t('auth.password')} error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
            </Field>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {t(apiErrorKey(error))}
              </p>
            )}
            <Button type="submit" disabled={isLoading}>
              {t('auth.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

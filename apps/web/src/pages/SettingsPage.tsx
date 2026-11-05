import { zodResolver } from '@hookform/resolvers/zod';
import {
  DOC_LOCALES,
  type OrganizationDto,
  type OrganizationSettingsInput,
  organizationSettingsSchema,
  Role,
  type UpdateMeInput,
  updateMeSchema,
} from '@savdo/shared';
import { LogOut, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Field } from '@/components/Field';
import { LanguageSwitcher, ThemeSwitcher } from '@/components/Switchers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useAppSelector } from '@/store';
import {
  apiErrorKey,
  useLogoutMutation,
  useMeQuery,
  useOrganizationQuery,
  useTelegramLinkCodeMutation,
  useTelegramUnlinkMutation,
  useUpdateMeMutation,
  useUpdateOrganizationMutation,
} from '@/store/api';

export function SettingsPage() {
  const { t } = useTranslation();
  const isOwner = useAppSelector((s) => s.auth.user?.role === Role.OWNER);
  const { data: org } = useOrganizationQuery(undefined, { skip: !isOwner });
  const [logout] = useLogoutMutation();

  return (
    <div className="grid grid-cols-1 gap-4">
      <h1 className="text-xl font-semibold">{t('settings.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.appearance')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>{t('language.label')}</Label>
            <LanguageSwitcher />
          </div>
          <div className="grid gap-1.5">
            <Label>{t('theme.label')}</Label>
            <ThemeSwitcher />
          </div>
        </CardContent>
      </Card>

      <PasswordCard />
      <TelegramCard />
      {isOwner && org && <OrganizationCard key={org.id} org={org} />}

      <Button variant="outline" className="justify-self-start" onClick={() => void logout()}>
        <LogOut />
        {t('nav.logout')}
      </Button>
    </div>
  );
}

function PasswordCard() {
  const { t } = useTranslation();
  const [updateMe, { isLoading, error, isSuccess }] = useUpdateMeMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateMeInput>({ resolver: zodResolver(updateMeSchema) });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.changePassword')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="grid gap-3"
          onSubmit={handleSubmit(async (v) => {
            const r = await updateMe(v);
            if (!r.error) reset();
          })}
        >
          <Field
            id="cur-pass"
            label={t('settings.currentPassword')}
            error={errors.currentPassword?.message}
          >
            <Input
              id="cur-pass"
              type="password"
              autoComplete="current-password"
              {...register('currentPassword')}
            />
          </Field>
          <Field
            id="new-pass"
            label={t('settings.newPassword')}
            error={errors.newPassword?.message}
          >
            <Input
              id="new-pass"
              type="password"
              autoComplete="new-password"
              {...register('newPassword')}
            />
          </Field>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {t(apiErrorKey(error))}
            </p>
          )}
          {isSuccess && <p className="text-sm text-primary">{t('settings.saved')}</p>}
          <Button type="submit" className="justify-self-start" disabled={isLoading}>
            {t('common.save')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function OrganizationCard({ org }: { org: OrganizationDto }) {
  const { t } = useTranslation();
  const [save, { isLoading, error, isSuccess }] = useUpdateOrganizationMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationSettingsInput>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: {
      name: org.name,
      inn: org.inn,
      address: org.address,
      markupPercent: org.markupPercent,
      advancePercent: org.advancePercent,
      phone: org.phone,
      director: org.director,
      bankName: org.bankName,
      bankAccount: org.bankAccount,
      bankMfo: org.bankMfo,
      docLocale: org.docLocale,
      shartnomaPrefix: org.shartnomaPrefix,
      hisobFakturaPrefix: org.hisobFakturaPrefix,
      yukXatiPrefix: org.yukXatiPrefix,
      aktPrefix: org.aktPrefix,
    },
  });
  type TextKey = Exclude<
    keyof OrganizationSettingsInput,
    'markupPercent' | 'advancePercent' | 'docLocale'
  >;
  const text = (name: TextKey, label: string, numeric = false) => (
    <Field id={`o-${name}`} label={label} error={errors[name]?.message}>
      <Input id={`o-${name}`} inputMode={numeric ? 'numeric' : undefined} {...register(name)} />
    </Field>
  );
  const numErr = (m?: string) => (m && !m.includes('.') ? 'validation.number' : m);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.organization')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form noValidate className="grid gap-3" onSubmit={handleSubmit((v) => save(v))}>
          <Field id="o-name" label={t('settings.orgName')} error={errors.name?.message}>
            <Input id="o-name" {...register('name')} />
          </Field>
          <Field id="o-inn" label={t('settings.inn')} error={errors.inn?.message}>
            <Input id="o-inn" inputMode="numeric" {...register('inn')} />
          </Field>
          <Field id="o-address" label={t('settings.address')} error={errors.address?.message}>
            <Input id="o-address" {...register('address')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="o-markup"
              label={t('settings.markupPercent')}
              error={numErr(errors.markupPercent?.message)}
            >
              <Input
                id="o-markup"
                type="number"
                inputMode="numeric"
                step={1}
                {...register('markupPercent', { valueAsNumber: true })}
              />
            </Field>
            <Field
              id="o-advance"
              label={t('settings.advancePercent')}
              error={numErr(errors.advancePercent?.message)}
            >
              <Input
                id="o-advance"
                type="number"
                inputMode="numeric"
                step={1}
                {...register('advancePercent', { valueAsNumber: true })}
              />
            </Field>
          </div>
          {text('phone', t('settings.phone'))}
          {text('director', t('settings.director'))}
          <h3 className="pt-2 text-sm font-semibold">{t('settings.bank')}</h3>
          {text('bankName', t('settings.bankName'))}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
            {text('bankAccount', t('settings.bankAccount'), true)}
            {text('bankMfo', t('settings.bankMfo'), true)}
          </div>
          <h3 className="pt-2 text-sm font-semibold">{t('settings.documents')}</h3>
          <Field id="o-docLocale" label={t('settings.docLocale')}>
            <Select id="o-docLocale" {...register('docLocale')}>
              {DOC_LOCALES.map((l) => (
                <option key={l} value={l}>
                  {t(`language.${l}`)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {text('shartnomaPrefix', t('documents.types.SHARTNOMA'))}
            {text('hisobFakturaPrefix', t('documents.types.HISOB_FAKTURA'))}
            {text('yukXatiPrefix', t('documents.types.YUK_XATI'))}
            {text('aktPrefix', t('documents.types.AKT'))}
          </div>
          <p className="text-xs text-muted-foreground">{t('settings.prefixHint')}</p>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {t(apiErrorKey(error))}
            </p>
          )}
          {isSuccess && <p className="text-sm text-primary">{t('settings.saved')}</p>}
          <Button type="submit" className="justify-self-start" disabled={isLoading}>
            {t('common.save')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TelegramCard() {
  const { t } = useTranslation();
  const linked = useAppSelector((s) => s.auth.user?.telegramLinked ?? false);
  const [getCode, codeState] = useTelegramLinkCodeMutation();
  const [unlink, unlinkState] = useTelegramUnlinkMutation();
  const [poll, setPoll] = useState(false);
  // Kod olingach bot orqali ulanganini bilish uchun /auth/me so'rab turiladi
  useMeQuery(undefined, { pollingInterval: poll && !linked ? 5000 : 0, skip: !poll });
  const link = codeState.data;
  const err = codeState.error ?? unlinkState.error;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('telegram.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {linked ? (
          <>
            <p className="text-primary">{t('telegram.linked')}</p>
            <Button
              variant="outline"
              className="justify-self-start"
              onClick={() => void unlink().then(() => setPoll(true))}
              disabled={unlinkState.isLoading}
            >
              {t('telegram.unlink')}
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">{t('telegram.hint')}</p>
            {link && (
              <div className="grid gap-2 rounded-md border p-3">
                <p>
                  {t('telegram.code')}:{' '}
                  <span className="font-mono text-lg font-semibold tracking-widest">
                    {link.code}
                  </span>
                </p>
                <p className="break-words font-mono text-xs">/start {link.code}</p>
                <p className="text-xs text-muted-foreground">{t('telegram.expires')}</p>
                {link.deepLink && (
                  <Button asChild className="justify-self-start">
                    <a href={link.deepLink} target="_blank" rel="noreferrer">
                      <Send />
                      {t('telegram.openBot', { bot: `@${link.botUsername}` })}
                    </a>
                  </Button>
                )}
              </div>
            )}
            <Button
              variant={link ? 'outline' : 'default'}
              className="justify-self-start"
              onClick={() => void getCode().then(() => setPoll(true))}
              disabled={codeState.isLoading}
            >
              {link ? t('telegram.newCode') : t('telegram.link')}
            </Button>
          </>
        )}
        {err && (
          <p className="text-sm text-destructive" role="alert">
            {t(apiErrorKey(err))}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

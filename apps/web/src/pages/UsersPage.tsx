import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreateUserInput,
  createUserSchema,
  passwordSchema,
  ROLES,
  updateUserSchema,
  type UserDto,
} from '@savdo/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Field } from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAppSelector } from '@/store';
import {
  apiErrorKey,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUsersQuery,
} from '@/store/api';

// Tahrirlashda parol bo'sh qolsa — o'zgarmaydi
const editSchema = updateUserSchema
  .pick({ name: true, phone: true, role: true })
  .required()
  .extend({ password: z.union([z.literal(''), passwordSchema]) });
type EditValues = z.infer<typeof editSchema>;

type Mode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; user: UserDto };

export function UsersPage() {
  const { t } = useTranslation();
  const { data: users = [], isLoading } = useUsersQuery();
  const [mode, setMode] = useState<Mode>({ kind: 'closed' });
  const meId = useAppSelector((s) => s.auth.user?.id);
  const [updateUser, { error: toggleError }] = useUpdateUserMutation();

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('users.title')}</h1>
        <Button size="sm" onClick={() => setMode({ kind: 'create' })}>
          <Plus />
          {t('users.add')}
        </Button>
      </div>

      {mode.kind === 'create' && <CreateForm onDone={() => setMode({ kind: 'closed' })} />}
      {mode.kind === 'edit' && (
        <EditForm key={mode.user.id} user={mode.user} onDone={() => setMode({ kind: 'closed' })} />
      )}
      {toggleError && (
        <p className="text-sm text-destructive" role="alert">
          {t(apiErrorKey(toggleError))}
        </p>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">{t('app.loading')}</p>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground">{t('users.empty')}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-2 p-3">
              <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                <p className="truncate font-medium">{u.name}</p>
                <p className="text-sm text-muted-foreground">
                  {u.phone} · {t(`roles.${u.role}`)}
                  {!u.isActive && ` · ${t('users.inactive')}`}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMode({ kind: 'edit', user: u })}
              >
                {t('users.edit')}
              </Button>
              {u.id !== meId && (
                <Button
                  size="sm"
                  variant={u.isActive ? 'ghost' : 'secondary'}
                  onClick={() => void updateUser({ id: u.id, body: { isActive: !u.isActive } })}
                >
                  {u.isActive ? t('users.deactivate') : t('users.activate')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoleOptions() {
  const { t } = useTranslation();
  return ROLES.map((r) => (
    <option key={r} value={r}>
      {t(`roles.${r}`)}
    </option>
  ));
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [createUser, { isLoading, error }] = useCreateUserMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'SOTUVCHI' },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('users.add')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="grid gap-3"
          onSubmit={handleSubmit(async (v) => {
            const r = await createUser(v);
            if (!r.error) onDone();
          })}
        >
          <Field id="u-name" label={t('users.name')} error={errors.name?.message}>
            <Input id="u-name" {...register('name')} />
          </Field>
          <Field id="u-phone" label={t('users.phone')} error={errors.phone?.message}>
            <Input id="u-phone" type="tel" inputMode="tel" {...register('phone')} />
          </Field>
          <Field id="u-role" label={t('users.role')} error={errors.role?.message}>
            <Select id="u-role" {...register('role')}>
              <RoleOptions />
            </Select>
          </Field>
          <Field id="u-password" label={t('users.password')} error={errors.password?.message}>
            <Input
              id="u-password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
          </Field>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {t(apiErrorKey(error))}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {t('common.save')}
            </Button>
            <Button type="button" variant="ghost" onClick={onDone}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EditForm({ user, onDone }: { user: UserDto; onDone: () => void }) {
  const { t } = useTranslation();
  const [updateUser, { isLoading, error }] = useUpdateUserMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: user.name, phone: user.phone, role: user.role, password: '' },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('users.edit')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="grid gap-3"
          onSubmit={handleSubmit(async ({ password, ...rest }) => {
            const r = await updateUser({
              id: user.id,
              body: password ? { ...rest, password } : rest,
            });
            if (!r.error) onDone();
          })}
        >
          <Field id="e-name" label={t('users.name')} error={errors.name?.message}>
            <Input id="e-name" {...register('name')} />
          </Field>
          <Field id="e-phone" label={t('users.phone')} error={errors.phone?.message}>
            <Input id="e-phone" type="tel" inputMode="tel" {...register('phone')} />
          </Field>
          <Field id="e-role" label={t('users.role')} error={errors.role?.message}>
            <Select id="e-role" {...register('role')}>
              <RoleOptions />
            </Select>
          </Field>
          <Field
            id="e-password"
            label={t('users.newPasswordOptional')}
            error={errors.password?.message}
          >
            <Input
              id="e-password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
          </Field>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {t(apiErrorKey(error))}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {t('common.save')}
            </Button>
            <Button type="button" variant="ghost" onClick={onDone}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

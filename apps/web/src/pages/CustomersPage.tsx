import { zodResolver } from '@hookform/resolvers/zod';
import {
  CUSTOMER_TYPES,
  type CustomerCreateInput,
  customerCreateSchema,
  type CustomerDto,
  Role,
} from '@savdo/shared';
import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge, ErrorText, PageHeader } from '@/components/common';
import { Field } from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatMoney, optionalNumber } from '@/lib/format';
import { useAppSelector } from '@/store';
import {
  useCreateCustomerMutation,
  useCustomersQuery,
  useUpdateCustomerMutation,
} from '@/store/api';

export function CustomersPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(h);
  }, [q]);
  const { data = [], isFetching } = useCustomersQuery({ q: debounced || undefined });

  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader
        title={t('customers.title')}
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus />
            {t('common.add')}
          </Button>
        }
      />
      {creating && <CustomerForm onDone={() => setCreating(false)} />}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label={t('customers.search')}
          placeholder={t('customers.search')}
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {data.length === 0 ? (
        <p className="text-muted-foreground">
          {isFetching ? t('app.loading') : t('customers.empty')}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {data.map((c) => (
            <li key={c.id}>
              <Link
                to={`/customers/${c.id}`}
                className="flex items-center gap-3 p-3 hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {t(`customerType.${c.type}`)}
                    {c.phone && ` · ${c.phone}`}
                  </p>
                </div>
                {c.debt > 0 && (
                  <Badge tone={c.hasOverdue ? 'danger' : 'warn'}>{formatMoney(c.debt)}</Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CustomerForm({
  customer,
  onDone,
}: {
  customer?: CustomerDto;
  onDone: (c?: CustomerDto) => void;
}) {
  const { t } = useTranslation();
  const isOwner = useAppSelector((s) => s.auth.user?.role === Role.OWNER);
  const [create, createState] = useCreateCustomerMutation();
  const [update, updateState] = useUpdateCustomerMutation();
  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
  } = useForm<CustomerCreateInput>({
    resolver: zodResolver(customerCreateSchema),
    defaultValues: customer
      ? {
          type: customer.type,
          name: customer.name,
          phone: customer.phone,
          inn: customer.inn,
          address: customer.address,
          creditLimit: customer.creditLimit,
        }
      : { type: 'JISMONIY' },
  });

  return (
    <Card>
      <CardContent className="pt-4">
        <form
          noValidate
          className="grid gap-3"
          onSubmit={handleSubmit(async (v) => {
            const body = { ...v };
            if (!isOwner || !dirtyFields.creditLimit) delete body.creditLimit;
            const r = customer ? await update({ id: customer.id, body }) : await create(body);
            if (r.data) onDone(r.data);
          })}
        >
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <Field id="cu-type" label={t('customers.type')} error={errors.type?.message}>
              <Select id="cu-type" {...register('type')}>
                {CUSTOMER_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {t(`customerType.${ct}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="cu-name" label={t('customers.name')} error={errors.name?.message}>
              <Input id="cu-name" {...register('name')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="cu-phone" label={t('customers.phone')} error={errors.phone?.message}>
              <Input id="cu-phone" type="tel" inputMode="tel" {...register('phone')} />
            </Field>
            <Field id="cu-inn" label={t('settings.inn')} error={errors.inn?.message}>
              <Input id="cu-inn" inputMode="numeric" {...register('inn')} />
            </Field>
          </div>
          <Field id="cu-address" label={t('settings.address')} error={errors.address?.message}>
            <Input id="cu-address" {...register('address')} />
          </Field>
          {isOwner && (
            <Field
              id="cu-limit"
              label={t('customers.creditLimit')}
              error={errors.creditLimit?.message}
            >
              <Input
                id="cu-limit"
                type="number"
                inputMode="numeric"
                step={1}
                {...register('creditLimit', { setValueAs: optionalNumber })}
              />
            </Field>
          )}
          <ErrorText error={createState.error ?? updateState.error} />
          <div className="flex gap-2">
            <Button type="submit" disabled={createState.isLoading || updateState.isLoading}>
              {t('common.save')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => onDone()}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

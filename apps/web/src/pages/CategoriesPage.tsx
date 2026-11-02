import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CategoryCreateInput,
  categoryCreateSchema,
  type CategoryDto,
  canSeeCost,
} from '@savdo/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { CategorySelect } from '@/components/CategorySelect';
import { Badge, ErrorText, PageHeader, sortTree } from '@/components/common';
import { Field } from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { nullableNumber } from '@/lib/format';
import { useAppSelector } from '@/store';
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useOrganizationQuery,
  useUpdateCategoryMutation,
} from '@/store/api';

type Mode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; category: CategoryDto };

export function CategoriesPage() {
  const { t } = useTranslation();
  const { data = [] } = useCategoriesQuery();
  const showCost = canSeeCost(useAppSelector((s) => s.auth.user?.role));
  const { data: org } = useOrganizationQuery();
  const [mode, setMode] = useState<Mode>({ kind: 'closed' });
  const [update, updateState] = useUpdateCategoryMutation();

  return (
    <div className="grid grid-cols-1 gap-4">
      <PageHeader
        title={t('categories.title')}
        actions={
          <Button size="sm" onClick={() => setMode({ kind: 'create' })}>
            <Plus />
            {t('common.add')}
          </Button>
        }
      />
      {showCost && org && (
        <p className="text-sm text-muted-foreground">
          {t('categories.markupHint', { percent: org.markupPercent })}
        </p>
      )}
      {mode.kind !== 'closed' && (
        <CategoryForm
          key={mode.kind === 'edit' ? mode.category.id : 'new'}
          category={mode.kind === 'edit' ? mode.category : undefined}
          showCost={showCost}
          onDone={() => setMode({ kind: 'closed' })}
        />
      )}
      <ErrorText error={updateState.error} />
      {data.length === 0 ? (
        <p className="text-muted-foreground">{t('categories.empty')}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {sortTree(data).map(({ item: c, depth }) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 p-3">
              <div className="min-w-0 flex-1" style={{ paddingLeft: `${depth * 16}px` }}>
                <p className="truncate font-medium">
                  {c.name} {!c.isActive && <Badge>{t('common.inactive')}</Badge>}
                </p>
                {showCost && (
                  <p className="text-sm text-muted-foreground">
                    {c.markupPercent !== null
                      ? t('categories.markupValue', { percent: c.markupPercent })
                      : t('categories.markupInherited')}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMode({ kind: 'edit', category: c })}
              >
                {t('common.edit')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void update({ id: c.id, body: { isActive: !c.isActive } })}
              >
                {c.isActive ? t('common.deactivate') : t('common.activate')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryForm({
  category,
  showCost,
  onDone,
}: {
  category?: CategoryDto;
  showCost: boolean;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [create, createState] = useCreateCategoryMutation();
  const [update, updateState] = useUpdateCategoryMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryCreateInput>({
    resolver: zodResolver(categoryCreateSchema),
    defaultValues: category
      ? { name: category.name, parentId: category.parentId, markupPercent: category.markupPercent }
      : { parentId: null, markupPercent: null },
  });

  return (
    <Card>
      <CardContent className="pt-4">
        <form
          noValidate
          className="grid gap-3"
          onSubmit={handleSubmit(async (v) => {
            const body = showCost ? v : { name: v.name, parentId: v.parentId };
            const r = category ? await update({ id: category.id, body }) : await create(body);
            if (!r.error) onDone();
          })}
        >
          <Field id="c-name" label={t('categories.name')} error={errors.name?.message}>
            <Input id="c-name" {...register('name')} />
          </Field>
          <Field id="c-parent" label={t('categories.parent')} error={errors.parentId?.message}>
            <CategorySelect
              id="c-parent"
              emptyLabel={t('categories.noParent')}
              excludeId={category?.id}
              {...register('parentId', { setValueAs: (v) => (v ? v : null) })}
            />
          </Field>
          {showCost && (
            <Field
              id="c-markup"
              label={t('categories.markup')}
              error={errors.markupPercent ? 'validation.number' : undefined}
            >
              <Input
                id="c-markup"
                type="number"
                inputMode="numeric"
                step={1}
                placeholder={t('categories.markupInherited')}
                {...register('markupPercent', { setValueAs: nullableNumber })}
              />
            </Field>
          )}
          <ErrorText error={createState.error ?? updateState.error} />
          <div className="flex gap-2">
            <Button type="submit" disabled={createState.isLoading || updateState.isLoading}>
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

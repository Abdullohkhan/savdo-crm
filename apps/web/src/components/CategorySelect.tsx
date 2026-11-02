import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategoriesQuery } from '@/store/api';
import { sortTree } from './common';
import { Select } from './ui/select';

/** Toifa tanlash (daraxt ko'rinishida). Bo'sh qiymat — "toifasiz"/"hammasi" */
export function CategorySelect({
  emptyLabel,
  excludeId,
  ...props
}: ComponentProps<'select'> & { emptyLabel: string; excludeId?: string }) {
  const { t } = useTranslation();
  const { data = [] } = useCategoriesQuery();
  return (
    <Select {...props}>
      <option value="">{emptyLabel}</option>
      {sortTree(data.filter((c) => c.isActive || c.id === props.value)).map(({ item, depth }) =>
        item.id === excludeId ? null : (
          <option key={item.id} value={item.id}>
            {`${'— '.repeat(depth)}${item.name}`}
            {!item.isActive ? ` (${t('common.inactive')})` : ''}
          </option>
        ),
      )}
    </Select>
  );
}

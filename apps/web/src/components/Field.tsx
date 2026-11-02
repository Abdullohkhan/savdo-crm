import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from './ui/label';

interface Props {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

/** Label + input + tarjima qilingan xato */
export function Field({ id, label, error, children }: Props) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  );
}

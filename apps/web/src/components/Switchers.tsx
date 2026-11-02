import { LOCALES, type Locale, THEMES, type Theme } from '@savdo/shared';
import { useTranslation } from 'react-i18next';
import { useUpdateMeMutation } from '@/store/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { setLocale, setTheme } from '@/store/uiSlice';
import { Select } from './ui/select';

export function ThemeSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation();
  const theme = useAppSelector((s) => s.ui.theme);
  const dispatch = useAppDispatch();
  return (
    <Select
      aria-label={t('theme.label')}
      className={className}
      value={theme}
      onChange={(e) => dispatch(setTheme(e.target.value as Theme))}
    >
      {THEMES.map((v) => (
        <option key={v} value={v}>
          {t(`theme.${v}`)}
        </option>
      ))}
    </Select>
  );
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation();
  const locale = useAppSelector((s) => s.ui.locale);
  const loggedIn = useAppSelector((s) => !!s.auth.user);
  const dispatch = useAppDispatch();
  const [updateMe] = useUpdateMeMutation();

  const change = (l: Locale) => {
    dispatch(setLocale(l));
    // Til foydalanuvchiga saqlanadi
    if (loggedIn) void updateMe({ locale: l });
  };

  return (
    <Select
      aria-label={t('language.label')}
      className={className}
      value={locale}
      onChange={(e) => change(e.target.value as Locale)}
    >
      {LOCALES.map((v) => (
        <option key={v} value={v}>
          {t(`language.${v}`)}
        </option>
      ))}
    </Select>
  );
}

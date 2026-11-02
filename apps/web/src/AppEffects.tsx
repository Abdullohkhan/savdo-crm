import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LOCALE_KEY, THEME_KEY, writeStorage } from '@/lib/storage';
import { applyTheme } from '@/lib/theme';
import { useAppDispatch, useAppSelector } from '@/store';
import { useRefreshMutation } from '@/store/api';
import { setLocale } from '@/store/uiSlice';

/** Tema, til va sessiyani tiklash — UI'siz yon ta'sirlar */
export function AppEffects() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const locale = useAppSelector((s) => s.ui.locale);
  const user = useAppSelector((s) => s.auth.user);
  const initialized = useAppSelector((s) => s.auth.initialized);
  const { i18n } = useTranslation();
  const [refresh] = useRefreshMutation();

  // Tema: <html class="dark">, tanlov saqlanadi, "system" OS o'zgarishini kuzatadi
  useEffect(() => {
    applyTheme(theme);
    writeStorage(THEME_KEY, theme);
    if (theme !== 'system' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  useEffect(() => {
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
    writeStorage(LOCALE_KEY, locale);
  }, [locale, i18n]);

  // Kirgan foydalanuvchining saqlangan tili qo'llanadi
  const userLocale = user?.locale;
  useEffect(() => {
    if (userLocale) dispatch(setLocale(userLocale));
  }, [userLocale, dispatch]);

  // Sahifa yangilanganda access token yo'q — refresh cookie orqali tiklaymiz
  useEffect(() => {
    if (initialized) return;
    void refresh();
  }, [initialized, refresh]);

  return null;
}

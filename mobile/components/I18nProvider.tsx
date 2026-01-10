import { useEffect, useState, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { I18nManager } from 'react-native';

import i18n, { initI18n, changeLanguage, isRTL, resolveDisplayLanguage } from '@/lib/i18n';
import { useDisplayLanguage } from '@/lib/store/hooks';

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const displayLanguage = useDisplayLanguage();
  const [i18nReady, setI18nReady] = useState(false);

  // Initialize i18n on first render (after Redux rehydration)
  useEffect(() => {
    if (!i18nReady) {
      initI18n(displayLanguage);
      setI18nReady(true);
    }
  }, [displayLanguage, i18nReady]);

  // Update i18n when display language changes
  useEffect(() => {
    if (i18nReady) {
      changeLanguage(displayLanguage);

      // Handle RTL layout changes for future RTL language support
      const resolvedLang = resolveDisplayLanguage(displayLanguage);
      const shouldBeRTL = isRTL(resolvedLang);

      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);
        // Note: RTL changes require app restart to take full effect
      }
    }
  }, [displayLanguage, i18nReady]);

  if (!i18nReady) {
    return null;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

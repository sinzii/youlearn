import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemePreference } from '@/lib/store';

export function useColorScheme() {
  const systemColorScheme = useRNColorScheme();
  const themePreference = useThemePreference();

  if (themePreference === 'system') {
    return systemColorScheme;
  }

  return themePreference;
}

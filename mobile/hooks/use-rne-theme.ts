import { useTheme } from '@rneui/themed';

import { useColorScheme } from './use-color-scheme';

export function useRNETheme() {
  const { theme, updateTheme } = useTheme();
  const colorScheme = useColorScheme() ?? 'light';

  return {
    theme,
    colors: theme.colors,
    mode: theme.mode,
    isDark: colorScheme === 'dark',
    updateTheme,
  };
}

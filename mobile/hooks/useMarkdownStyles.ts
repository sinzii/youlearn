import { useMemo } from 'react';
import { useTheme } from '@rneui/themed';

type MarkdownVariant = 'default' | 'compact';

export function useMarkdownStyles(variant: MarkdownVariant = 'default') {
  const { theme } = useTheme();
  const codeBgColor = theme.mode === 'dark' ? '#333' : '#f0f0f0';

  const isCompact = variant === 'compact';

  return useMemo(
    () => ({
      body: {
        color: theme.colors.black,
        fontSize: 14,
        lineHeight: isCompact ? 20 : 22,
      },
      heading1: {
        fontSize: isCompact ? 18 : 24,
        fontWeight: '700' as const,
        marginTop: isCompact ? 8 : 16,
        marginBottom: isCompact ? 4 : 8,
        color: theme.colors.black,
      },
      heading2: {
        fontSize: isCompact ? 16 : 20,
        fontWeight: '600' as const,
        marginTop: isCompact ? 6 : 14,
        marginBottom: isCompact ? 3 : 6,
        color: theme.colors.black,
      },
      heading3: {
        fontSize: isCompact ? 14 : 16,
        fontWeight: '600' as const,
        marginTop: isCompact ? 4 : 12,
        marginBottom: isCompact ? 2 : 4,
        color: theme.colors.black,
      },
      paragraph: {
        marginTop: 0,
        marginBottom: isCompact ? 6 : 8,
      },
      list_item: {
        marginBottom: isCompact ? 2 : 4,
      },
      strong: {
        fontWeight: '700' as const,
      },
      em: {
        fontStyle: 'italic' as const,
      },
      link: {
        color: theme.colors.primary,
        textDecorationLine: 'underline' as const,
      },
      code_inline: {
        fontFamily: 'monospace',
        fontSize: isCompact ? 12 : 13,
        backgroundColor: codeBgColor,
        color: theme.colors.black,
        paddingHorizontal: 4,
        borderRadius: 3,
      },
      code_block: {
        fontFamily: 'monospace',
        fontSize: isCompact ? 12 : 13,
        backgroundColor: codeBgColor,
        color: theme.colors.black,
        padding: 8,
        borderRadius: 4,
        marginVertical: isCompact ? 4 : 0,
      },
      fence: {
        fontFamily: 'monospace',
        fontSize: isCompact ? 12 : 13,
        backgroundColor: codeBgColor,
        color: theme.colors.black,
        padding: 8,
        borderRadius: 4,
        marginVertical: isCompact ? 4 : 0,
      },
    }),
    [theme, codeBgColor, isCompact]
  );
}

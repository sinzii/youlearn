import { Pressable, StyleSheet } from 'react-native';
import { Text, useTheme } from '@rneui/themed';
import { formatSecondsToTime } from '@/utils/transcript';

interface TimestampLinkProps {
  start: number; // seconds
  end: number | null; // seconds
  onPress: (seconds: number) => void;
}

export function TimestampLink({ start, end, onPress }: TimestampLinkProps) {
  const { theme } = useTheme();

  // Display as MM:SS format for user readability
  const label = end
    ? `${formatSecondsToTime(start)}-${formatSecondsToTime(end)}`
    : formatSecondsToTime(start);

  return (
    <Pressable
      onPress={() => onPress(start)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed
            ? theme.colors.primary + '20'
            : theme.colors.primary + '10',
        },
      ]}
    >
      <Text style={[styles.text, { color: theme.colors.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
});

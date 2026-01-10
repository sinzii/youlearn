import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from '@rneui/themed';
import { useTranslation } from 'react-i18next';
import {
  DETAIL_LEVEL_OPTIONS,
  DetailLevelOption,
} from '@/lib/store/slices/languageSlice';

import {
  useDetailLevel,
  useSetDetailLevel
} from '@/lib/store/hooks'

export function DetailLevelSelector() {
  const {theme} = useTheme();
  const { t } = useTranslation();
  const detailLevel = useDetailLevel();
  const setDetailLevel = useSetDetailLevel();

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.grey0}]}>
      {DETAIL_LEVEL_OPTIONS.map((option: DetailLevelOption) => {
        const isSelected = option.code === detailLevel;
        return (
          <TouchableOpacity
            key={option.code}
            style={[
              styles.button,
              isSelected && [styles.buttonActive, {backgroundColor: theme.colors.primary}],
            ]}
            onPress={() => setDetailLevel(option.code)}
          >
            <Text
              style={[
                styles.buttonText,
                {color: isSelected ? '#fff' : theme.colors.grey4},
              ]}
            >
              {t(`detailLevel.${option.code}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

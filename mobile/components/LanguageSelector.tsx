import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@rneui/themed';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  LANGUAGE_OPTIONS,
  LanguageCode,
  LanguageOption,
  usePreferredLanguage,
  useSetPreferredLanguage,
} from '@/lib/store';

export function LanguageSelector() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const preferredLanguage = usePreferredLanguage();
  const setPreferredLanguage = useSetPreferredLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = LANGUAGE_OPTIONS.find(
    (opt: LanguageOption) => opt.code === preferredLanguage
  ) || LANGUAGE_OPTIONS[0];

  const handleSelect = (code: LanguageCode) => {
    setPreferredLanguage(code);
    setModalVisible(false);
  };

  return (
    <>
      <Pressable
        style={[
          styles.selector,
          { backgroundColor: theme.colors.grey0 },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="translate" size={18} color={theme.colors.grey4} />
        <Text style={[styles.selectedText, { color: theme.colors.black }]}>
          {selectedOption.name !== selectedOption.nativeName
            ? `${selectedOption.name} / ${selectedOption.nativeName}`
            : selectedOption.name}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.grey4} />
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.greyOutline }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.black }]}>
              {t('language.selectContentLanguage')}
            </Text>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
              <MaterialIcons name="close" size={24} color={theme.colors.black} />
            </Pressable>
          </View>

          <FlatList
            data={LANGUAGE_OPTIONS}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const isSelected = item.code === preferredLanguage;
              return (
                <Pressable
                  style={[
                    styles.option,
                    { backgroundColor: isSelected ? theme.colors.grey0 : 'transparent' },
                  ]}
                  onPress={() => handleSelect(item.code)}
                >
                  <View style={styles.optionText}>
                    <Text style={[styles.optionName, { color: theme.colors.black }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.optionNative, { color: theme.colors.grey4 }]}>
                      {item.nativeName}
                    </Text>
                  </View>
                  {isSelected && (
                    <MaterialIcons name="check" size={20} color={theme.colors.primary} />
                  )}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  selectedText: {
    flex: 1,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionText: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
  },
  optionNative: {
    fontSize: 13,
    marginTop: 2,
  },
});

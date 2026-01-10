import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@rneui/themed';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  DisplayLanguageCode,
  DISPLAY_LANGUAGE_OPTIONS,
} from '@/lib/store/slices/displayLanguageSlice';

import {
  useDisplayLanguage,
  useSetDisplayLanguage,
} from '@/lib/store/hooks';
import { changeLanguage } from '@/lib/i18n';

interface DisplayLanguageOption {
  code: DisplayLanguageCode;
  name: string;
  nativeName: string;
}

export function DisplayLanguageSelector() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const displayLanguage = useDisplayLanguage();
  const setDisplayLanguage = useSetDisplayLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption =
    DISPLAY_LANGUAGE_OPTIONS.find(
      (opt: DisplayLanguageOption) => opt.code === displayLanguage
    ) || DISPLAY_LANGUAGE_OPTIONS[0];

  const handleSelect = (code: DisplayLanguageCode) => {
    setDisplayLanguage(code);
    changeLanguage(code); // Update i18n immediately
    setModalVisible(false);
  };

  // Translate the "Auto" option dynamically, show both name and nativeName when different
  const getOptionLabel = (option: DisplayLanguageOption) => {
    if (option.code === 'auto') {
      return t('language.auto');
    }
    if (option.name !== option.nativeName) {
      return `${option.name} / ${option.nativeName}`;
    }
    return option.name;
  };

  return (
    <>
      <Pressable
        style={[
          styles.selector,
          {
            backgroundColor: theme.colors.grey0,
            borderColor: theme.colors.greyOutline,
          },
        ]}
        onPress={() => setModalVisible(true)}>
        <MaterialIcons name="language" size={18} color={theme.colors.grey4} />
        <Text style={[styles.selectedText, { color: theme.colors.black }]}>
          {getOptionLabel(selectedOption)}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.grey4} />
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.greyOutline }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.black }]}>
              {t('language.selectDisplayLanguage')}
            </Text>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
              <MaterialIcons name="close" size={24} color={theme.colors.black} />
            </Pressable>
          </View>

          <FlatList
            data={DISPLAY_LANGUAGE_OPTIONS}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const isSelected = item.code === displayLanguage;
              return (
                <Pressable
                  style={[
                    styles.option,
                    { backgroundColor: isSelected ? theme.colors.grey0 : 'transparent' },
                  ]}
                  onPress={() => handleSelect(item.code)}>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionName, { color: theme.colors.black }]}>
                      {getOptionLabel(item)}
                    </Text>
                    {item.code !== 'auto' && (
                      <Text style={[styles.optionNative, { color: theme.colors.grey4 }]}>
                        {item.nativeName}
                      </Text>
                    )}
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
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
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

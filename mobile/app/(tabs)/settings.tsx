import { useClerk, useUser } from '@clerk/clerk-expo';
import { useCallback } from 'react';
import { StyleSheet, Image, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, useTheme } from '@rneui/themed';
import { useTranslation } from 'react-i18next';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemePreference } from '@/lib/store';
import { useThemePreference, useSetThemePreference, useSubscription } from '@/lib/store/hooks';
import { DisplayLanguageSelector } from '@/components/DisplayLanguageSelector';

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const themePreference = useThemePreference();
  const setThemePreference = useSetThemePreference();
  const subscription = useSubscription();

  const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
    { value: 'system', label: t('settings.themeSystem') },
  ];

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const getSubscriptionStatusLabel = () => {
    if (subscription.isTrialing) return t('subscription.trial');
    if (subscription.isPro) return t('subscription.active');
    return t('subscription.expired');
  };

  const formatExpirationDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.title, { color: theme.colors.black }]}>
          {t('settings.title')}
        </Text>

        <View
          style={[
            styles.profileCard,
            { backgroundColor: theme.colors.grey0 },
          ]}>
          <Image source={{ uri: user?.imageUrl }} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: theme.colors.black }]}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={[styles.email, { color: theme.colors.grey4 }]}>
              {user?.emailAddresses[0]?.emailAddress}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.grey4 }]}>
            {t('settings.theme')}
          </Text>
          <View
            style={[
              styles.segmentedControl,
              { backgroundColor: theme.colors.grey0 },
            ]}>
            {THEME_OPTIONS.map((option) => {
              const isSelected = themePreference === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.segmentButton,
                    isSelected && {
                      backgroundColor: theme.colors.background,
                    },
                  ]}
                  onPress={() => setThemePreference(option.value)}>
                  <Text
                    style={[
                      styles.segmentText,
                      { color: theme.colors.black },
                      isSelected && { fontWeight: '600' },
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.grey4 }]}>
            {t('settings.displayLanguage')}
          </Text>
          <DisplayLanguageSelector />
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.grey4 }]}>
            {t('subscription.title')}
          </Text>
          <View style={[styles.subscriptionCard, { backgroundColor: theme.colors.grey0 }]}>
            <View style={styles.subscriptionRow}>
              <Text style={[styles.subscriptionLabel, { color: theme.colors.grey4 }]}>
                {t('subscription.status')}
              </Text>
              <View style={styles.statusContainer}>
                <MaterialIcons
                  name={subscription.isPro || subscription.isTrialing ? 'check-circle' : 'cancel'}
                  size={16}
                  color={subscription.isPro || subscription.isTrialing ? theme.colors.success : theme.colors.error}
                />
                <Text style={[styles.subscriptionValue, { color: theme.colors.black }]}>
                  {getSubscriptionStatusLabel()}
                </Text>
              </View>
            </View>
            {subscription.expiredAt && (
              <View style={styles.subscriptionRow}>
                <Text style={[styles.subscriptionLabel, { color: theme.colors.grey4 }]}>
                  {t('subscription.expiresOn')}
                </Text>
                <Text style={[styles.subscriptionValue, { color: theme.colors.black }]}>
                  {formatExpirationDate(subscription.expiredAt)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Button
          title={t('settings.signOut')}
          onPress={handleSignOut}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    lineHeight: 36,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 14,
  },
  subscriptionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subscriptionLabel: {
    fontSize: 14,
  },
  subscriptionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

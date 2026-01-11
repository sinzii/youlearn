import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, useTheme } from '@rneui/themed';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PACKAGE_TYPE, PurchasesPackage } from 'react-native-purchases';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useClerk } from '@clerk/clerk-expo';
import { useRevenueCat } from '@/components/RevenueCatProvider';

export default function PaywallScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useClerk();
  const { packages, purchasePackage, restorePurchases, isConfigured } = useRevenueCat();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);

  // Sort packages: weekly first, then monthly, then yearly
  const sortedPackages = useMemo(() => {
    const order = {
      [PACKAGE_TYPE.WEEKLY]: 0,
      [PACKAGE_TYPE.MONTHLY]: 1,
      [PACKAGE_TYPE.ANNUAL]: 2,
    };
    return [...packages].sort(
      // @ts-ignore
      (a, b) => (order[a.packageType] ?? 99) - (order[b.packageType] ?? 99)
    );
  }, [packages]);

  // Set default selected package to monthly when modal opens
  const handleOpenModal = () => {
    if (sortedPackages.length > 0 && !selectedPackage) {
      const monthlyPkg = sortedPackages.find(p => p.packageType === PACKAGE_TYPE.MONTHLY);
      setSelectedPackage(monthlyPkg || sortedPackages[0]);
    }
    setShowPackageModal(true);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setIsPurchasing(true);
    try {
      const success = await purchasePackage(selectedPackage);
      if (success) {
        setShowPackageModal(false);
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert(t('paywall.purchaseError'), error.message);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      const hasActiveSubscription = await restorePurchases();
      if (hasActiveSubscription) {
        Alert.alert(t('paywall.restored'));
        router.replace('/(tabs)');
      } else {
        Alert.alert(t('paywall.restoreError'));
      }
    } catch (error: any) {
      Alert.alert(t('paywall.restoreError'), error.message);
    }
  };

  const handleLogout = useCallback(async () => {
    await signOut();
    router.replace('/sign-in');
  }, [signOut, router]);

  const getPackageLabel = (packageType: PACKAGE_TYPE) => {
    switch (packageType) {
      case PACKAGE_TYPE.WEEKLY:
        return t('paywall.weekly');
      case PACKAGE_TYPE.MONTHLY:
        return t('paywall.monthly');
      case PACKAGE_TYPE.ANNUAL:
        return t('paywall.yearly');
      default:
        return '';
    }
  };

  const getPackagePeriod = (packageType: PACKAGE_TYPE) => {
    switch (packageType) {
      case PACKAGE_TYPE.WEEKLY:
        return t('paywall.perWeek');
      case PACKAGE_TYPE.MONTHLY:
        return t('paywall.perMonth');
      case PACKAGE_TYPE.ANNUAL:
        return t('paywall.perYear');
      default:
        return '';
    }
  };

  const features = [
    { icon: 'auto-awesome', text: t('paywall.featureUnlimited') },
    { icon: 'chat', text: t('paywall.featureChat') },
    { icon: 'view-list', text: t('paywall.featureChapters') },
    { icon: 'speed', text: t('paywall.featurePriority') },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.colors.black }]}>{t('paywall.title')}</Text>

        <Text style={[styles.subtitle, { color: theme.colors.grey4 }]}>
          {t('paywall.subtitle')}
        </Text>

        {/* Trial badge */}
        <View style={[styles.trialBadge, { backgroundColor: theme.colors.primary + '20' }]}>
          <MaterialIcons name="star" size={16} color={theme.colors.primary} />
          <Text style={[styles.trialText, { color: theme.colors.primary }]}>
            {t('paywall.trialBadge')}
          </Text>
        </View>

        {/* Features list */}
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <MaterialIcons name={feature.icon as any} size={24} color={theme.colors.primary} />
              <Text style={[styles.featureText, { color: theme.colors.black }]}>
                {feature.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Spacer for future marketing content */}
        <View style={styles.spacer} />

        {/* CTA Button */}
        <Button
          title={t('paywall.startTrial')}
          onPress={handleOpenModal}
          disabled={!isConfigured}
          containerStyle={styles.ctaButton}
        />

        {/* Restore purchases & Logout */}
        <View style={styles.secondaryButtons}>
          <Button
            title={t('paywall.restore')}
            type="clear"
            onPress={handleRestore}
            titleStyle={{ color: theme.colors.grey4 }}
          />
          <Button
            title={t('settings.signOut')}
            type="clear"
            onPress={handleLogout}
            titleStyle={{ color: theme.colors.grey4 }}
          />
        </View>

        {/* Terms */}
        <Text style={[styles.terms, { color: theme.colors.grey4 }]}>{t('paywall.terms')}</Text>
      </ScrollView>

      {/* Package Selection Modal */}
      <Modal
        visible={showPackageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPackageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowPackageModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.black }]}>
                {t('paywall.choosePlan')}
              </Text>
              <Pressable onPress={() => setShowPackageModal(false)} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={theme.colors.grey4} />
              </Pressable>
            </View>

            {/* Package options */}
            <View style={styles.packagesContainer}>
              {sortedPackages.map((pkg) => {
                const isSelected = selectedPackage?.identifier === pkg.identifier;
                const isYearly = pkg.packageType === PACKAGE_TYPE.ANNUAL;
                const isMonthly = pkg.packageType === PACKAGE_TYPE.MONTHLY;

                return (
                  <Pressable
                    key={pkg.identifier}
                    style={[
                      styles.packageOption,
                      { borderColor: isSelected ? theme.colors.primary : theme.colors.grey2 },
                      isSelected && { backgroundColor: theme.colors.primary + '10' },
                    ]}
                    onPress={() => setSelectedPackage(pkg)}
                  >
                    {(isYearly || isMonthly) && (
                      <View style={[styles.bestValueBadge, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.bestValueText}>
                          {isYearly ? t('paywall.bestValue') : t('paywall.popular')}
                        </Text>
                      </View>
                    )}
                    <View style={styles.packageHeader}>
                      <View
                        style={[
                          styles.radioOuter,
                          { borderColor: isSelected ? theme.colors.primary : theme.colors.grey3 },
                        ]}
                      >
                        {isSelected && (
                          <View style={[styles.radioInner, { backgroundColor: theme.colors.primary }]} />
                        )}
                      </View>
                      <Text style={[styles.packageLabel, { color: theme.colors.black }]}>
                        {getPackageLabel(pkg.packageType)}
                      </Text>
                    </View>
                    <Text style={[styles.packagePrice, { color: theme.colors.black }]}>
                      {pkg.product.priceString}
                      <Text style={[styles.packagePeriod, { color: theme.colors.grey4 }]}>
                        {getPackagePeriod(pkg.packageType)}
                      </Text>
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Start trial button */}
            <Button
              title={t('paywall.startTrialButton')}
              onPress={handlePurchase}
              loading={isPurchasing}
              disabled={!selectedPackage || isPurchasing}
              containerStyle={styles.continueButton}
            />

            {/* Trial description */}
            {selectedPackage && (
              <Text style={[styles.trialDescription, { color: theme.colors.grey4 }]}>
                {t('paywall.trialDescription', {
                  price: selectedPackage.product.priceString,
                  period: getPackagePeriod(selectedPackage.packageType).replace('/', ''),
                })}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexGrow: 1,
    marginTop: 30
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 32,
    gap: 6,
  },
  trialText: {
    fontSize: 14,
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  featureText: {
    fontSize: 17,
    flex: 1,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  ctaButton: {
    marginBottom: 12,
  },
  secondaryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  terms: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  packagesContainer: {
    marginBottom: 24,
    gap: 12,
  },
  packageOption: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderBottomLeftRadius: 8,
  },
  bestValueText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  packageLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 32,
  },
  packagePeriod: {
    fontSize: 14,
    fontWeight: '400',
  },
  continueButton: {
    marginTop: 8,
  },
  trialDescription: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
});

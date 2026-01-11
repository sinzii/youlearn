import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@rneui/themed';

import { useIsPro, useIsTrialing } from '@/lib/store/hooks';
import { useRevenueCat } from '@/components/RevenueCatProvider';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

/**
 * SubscriptionGate component that wraps content requiring an active subscription.
 * Redirects to the paywall if the user doesn't have an active subscription or trial.
 */
export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const isPro = useIsPro();
  const isTrialing = useIsTrialing();
  const { isConfigured } = useRevenueCat();

  const hasAccess = isPro || isTrialing;

  useEffect(() => {
    // Don't redirect until RevenueCat is configured
    if (!isConfigured) return;

    // Redirect to paywall if user doesn't have access
    if (!hasAccess) {
      router.replace('/paywall');
    }
  }, [hasAccess, isConfigured, router]);

  // Show loading while RevenueCat is being configured
  if (!isConfigured) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Don't render children if user doesn't have access
  // (they will be redirected to paywall)
  if (!hasAccess) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

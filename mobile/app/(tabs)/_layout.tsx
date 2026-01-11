import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useTheme } from '@rneui/themed';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { SubscriptionGate } from '@/components/SubscriptionGate';

export default function TabLayout() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <SubscriptionGate>
      <Tabs
        detachInactiveScreens={Platform.OS !== 'ios'}
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.grey4,
          headerShown: false,
          animation: 'shift',
          sceneStyle: {
            backgroundColor: theme.colors.background,
          },
          tabBarStyle: {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.greyOutline,
          },
        }}>
        <Tabs.Screen
          name="history"
          options={{
            title: t('tabs.history'),
            tabBarIcon: ({ color }) => <IconSymbol size={20} name="clock.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.new'),
            tabBarIcon: ({ color }) => <IconSymbol size={20} name="plus.app.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tabs.settings'),
            tabBarIcon: ({ color }) => <IconSymbol size={20} name="gearshape.fill" color={color} />,
          }}
        />
      </Tabs>
    </SubscriptionGate>
  );
}

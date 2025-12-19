import { useClerk, useUser } from '@clerk/clerk-expo';
import { useCallback } from 'react';
import { StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { user } = useUser();
  const { signOut } = useClerk();

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const backgroundColor = colorScheme === 'dark' ? '#151718' : '#fff';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Settings
        </ThemedText>

        <ThemedView
          style={[
            styles.profileCard,
            { backgroundColor: colorScheme === 'dark' ? '#1e1e1e' : '#f5f5f5' },
          ]}>
          <Image source={{ uri: user?.imageUrl }} style={styles.avatar} />
          <ThemedView style={styles.profileInfo}>
            <ThemedText style={styles.name}>
              {user?.firstName} {user?.lastName}
            </ThemedText>
            <ThemedText style={styles.email}>
              {user?.emailAddresses[0]?.emailAddress}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: Colors[colorScheme].tint }]}
          onPress={handleSignOut}>
          <ThemedText style={styles.signOutButtonText}>Sign Out</ThemedText>
        </TouchableOpacity>
      </ThemedView>
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
    marginBottom: 24,
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
    backgroundColor: 'transparent',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    opacity: 0.6,
  },
  signOutButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

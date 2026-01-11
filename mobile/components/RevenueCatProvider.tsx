import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesPackage,
  LOG_LEVEL,
  PurchasesError,
} from 'react-native-purchases';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useSetSubscription, useResetSubscription } from '@/lib/store/hooks';

interface RevenueCatContextValue {
  customerInfo: CustomerInfo | null;
  packages: PurchasesPackage[];
  isConfigured: boolean;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

const RevenueCatContext = createContext<RevenueCatContextValue | null>(null);

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const setSubscription = useSetSubscription();
  const resetSubscription = useResetSubscription();

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);

  // Update Redux subscription state from CustomerInfo
  const updateSubscriptionState = useCallback(
    (info: CustomerInfo | null) => {
      if (!info) {
        resetSubscription();
        return;
      }

      const proEntitlement = info.entitlements.active['VideoInsight Pro'];
      const isPro = proEntitlement !== undefined;

      setSubscription({
        isPro,
        isTrialing: proEntitlement?.periodType === 'TRIAL',
        expiredAt: proEntitlement?.expirationDate || null,
        productIdentifier: proEntitlement?.productIdentifier || null,
        willRenew: proEntitlement?.willRenew ?? false,
      });
    },
    [setSubscription, resetSubscription]
  );

  // Only initialize RevenueCat when user is signed in
  // Requires both API key AND user ID
  useEffect(() => {
    // Wait for Clerk to load
    if (!isUserLoaded) return;

    // Don't initialize if user is not signed in
    if (!isSignedIn || !user?.id) return;

    const initialize = async () => {
      try {
        const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

        // Need API key to proceed
        if (!apiKey) {
          console.warn('RevenueCat API key not configured');
          return;
        }

        // Set log level for debugging
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        // Configure with user ID
        Purchases.configure({ apiKey, appUserID: user.id });

        // Login and get customer info
        const { customerInfo: info } = await Purchases.logIn(user.id);
        setCustomerInfo(info);
        updateSubscriptionState(info);

        // Fetch offerings
        const offerings = await Purchases.getOfferings();
        if (offerings.current?.availablePackages) {
          setPackages(offerings.current.availablePackages);
        }

        // Mark as configured - this is the signal that everything is ready
        setIsConfigured(true);
      } catch (error) {
        console.error('Failed to initialize RevenueCat:', error);
      }
    };

    initialize();
  }, [isUserLoaded, isSignedIn, user?.id, updateSubscriptionState]);

  // Handle sign-out: reset state when user signs out
  useEffect(() => {
    if (!isConfigured) return;

    if (!isSignedIn) {
      const handleSignOut = async () => {
        try {
          await Purchases.logOut();
          setCustomerInfo(null);
          updateSubscriptionState(null);
          setIsConfigured(false);
        } catch (error) {
          console.error('Failed to log out from RevenueCat:', error);
        }
      };
      handleSignOut();
    }
  }, [isConfigured, isSignedIn, updateSubscriptionState]);

  // Listen for customer info updates
  useEffect(() => {
    if (!isConfigured) return;

    const onUpdateCustomerInfo = (info: CustomerInfo) => {
      setCustomerInfo(info);
      updateSubscriptionState(info);
    };

    Purchases.addCustomerInfoUpdateListener(onUpdateCustomerInfo);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(onUpdateCustomerInfo);
    };
  }, [isConfigured, updateSubscriptionState]);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo: newInfo } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(newInfo);
      updateSubscriptionState(newInfo);
      return true;
    } catch (error) {
      const purchaseError = error as PurchasesError;
      if (!purchaseError.userCancelled) {
        console.error('Purchase failed:', error);
        throw error;
      }
      return false;
    }
  }, [updateSubscriptionState]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      updateSubscriptionState(info);
      return info.entitlements.active['VideoInsight Pro'] !== undefined;
    } catch (error) {
      console.error('Restore purchases failed:', error);
      throw error;
    }
  }, [updateSubscriptionState]);

  return (
    <RevenueCatContext.Provider
      value={{ customerInfo, packages, isConfigured, purchasePackage, restorePurchases }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (!context) {
    throw new Error('useRevenueCat must be used within RevenueCatProvider');
  }
  return context;
}

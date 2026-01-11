import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SubscriptionState {
  isPro: boolean;
  isTrialing: boolean;
  expiredAt: string | null;
  productIdentifier: string | null;
  willRenew: boolean;
}

const initialState: SubscriptionState = {
  isPro: false,
  isTrialing: false,
  expiredAt: null,
  productIdentifier: null,
  willRenew: false,
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setSubscription: (state, action: PayloadAction<Partial<SubscriptionState>>) => {
      return { ...state, ...action.payload };
    },
    resetSubscription: () => initialState,
  },
});

export const { setSubscription, resetSubscription } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;

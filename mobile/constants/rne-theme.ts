import { createTheme, Colors as RNEColors } from '@rneui/themed';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';

const tintColor = '#ff5c5c';

export const lightColors: Partial<RNEColors> = {
  primary: tintColor,
  secondary: '#687076',
  background: '#fff',
  white: '#fff',
  black: '#11181C',
  grey0: '#f5f5f5',
  grey1: '#e5e5e5',
  grey2: '#ddd',
  grey3: '#999',
  grey4: '#687076',
  grey5: '#333',
  greyOutline: '#ddd',
  searchBg: '#f5f5f5',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  disabled: '#999',
  divider: '#e5e5e5',
};

export const darkColors: Partial<RNEColors> = {
  primary: tintColor,
  secondary: '#9BA1A6',
  background: '#151718',
  white: '#151718',
  black: '#ECEDEE',
  grey0: '#1e1e1e',
  grey1: '#333',
  grey2: '#444',
  grey3: '#666',
  grey4: '#9BA1A6',
  grey5: '#ccc',
  greyOutline: '#333',
  searchBg: '#1e1e1e',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  disabled: '#666',
  divider: '#333',
};

export const rneTheme = createTheme({
  lightColors,
  darkColors,
  mode: 'light',
  components: {
    Button: {
      radius: 12,
      buttonStyle: { paddingVertical: 10 },
      titleStyle: { fontWeight: '600', fontSize: 16 },
    },
    Input: {
      inputContainerStyle: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
      },
      inputStyle: { fontSize: 16 },
    },
    Text: {
      style: { fontSize: 16, lineHeight: 24 },
    },
    ListItem: {
      containerStyle: { borderRadius: 12 },
    },
  },
});

// React Navigation compatible themes
export const navigationLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: tintColor,
    background: lightColors.background as string,
    card: lightColors.background as string,
    text: lightColors.black as string,
    border: lightColors.grey2 as string,
  },
};

export const navigationDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: tintColor,
    background: darkColors.background as string,
    card: darkColors.background as string,
    text: darkColors.black as string,
    border: darkColors.grey1 as string,
  },
};

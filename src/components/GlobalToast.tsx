import { useAtomValue } from 'jotai';
import type React from 'react';
import type { DimensionValue } from 'react-native';
import type { ToastConfigParams } from 'react-native-toast-message';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { FONTS, LED_THEME_BG_COLOR } from '~/constants';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';

const contentContainerStyle = {
  paddingHorizontal: 24,
  paddingVertical: 12,
};

const useToastStyles = (ledColor: string, defaultColor: string) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  return {
    style: {
      borderLeftColor: isLEDTheme ? ledColor : defaultColor,
      borderLeftWidth: 16,
      backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#333',
      borderRadius: isLEDTheme ? 0 : 6,
      width: (isTablet ? '50%' : '90%') as DimensionValue,
    },
    text1Style: {
      color: '#fff',
      fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
      fontSize: RFValue(14),
    },
    text2Style: {
      color: '#ccc',
      fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
      fontSize: RFValue(11),
    },
  };
};

type ThemedToastProps = ToastConfigParams<unknown> & {
  ledColor: string;
  defaultColor: string;
};

const ThemedBaseToast: React.FC<ThemedToastProps> = ({
  ledColor,
  defaultColor,
  ...props
}) => {
  const { style, text1Style, text2Style } = useToastStyles(
    ledColor,
    defaultColor
  );

  return (
    <BaseToast
      {...props}
      style={style}
      contentContainerStyle={contentContainerStyle}
      text1Style={text1Style}
      text2Style={text2Style}
    />
  );
};

const ThemedErrorToast: React.FC<ThemedToastProps> = ({
  ledColor,
  defaultColor,
  ...props
}) => {
  const { style, text1Style, text2Style } = useToastStyles(
    ledColor,
    defaultColor
  );

  return (
    <ErrorToast
      {...props}
      style={style}
      contentContainerStyle={contentContainerStyle}
      text1Style={text1Style}
      text2Style={text2Style}
    />
  );
};

const toastConfig = {
  success: (props: ToastConfigParams<unknown>) => (
    <ThemedBaseToast {...props} ledColor="#4caf50" defaultColor="#69c779" />
  ),
  error: (props: ToastConfigParams<unknown>) => (
    <ThemedErrorToast {...props} ledColor="#f44336" defaultColor="#fe6161" />
  ),
  info: (props: ToastConfigParams<unknown>) => (
    <ThemedBaseToast {...props} ledColor="#2196f3" defaultColor="#3498db" />
  ),
};

export const GlobalToast: React.FC = () => <Toast config={toastConfig} />;

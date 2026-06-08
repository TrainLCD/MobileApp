import { useAtomValue } from 'jotai';
import type React from 'react';
import { useMemo } from 'react';
import type { DimensionValue } from 'react-native';
import type { ToastConfigParams } from 'react-native-toast-message';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { FONTS, LED_THEME_BG_COLOR } from '~/constants';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';

export const GlobalToast: React.FC = () => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const toastConfig = useMemo(() => {
    const getToastStyle = (ledColor: string, defaultColor: string) => ({
      borderLeftColor: isLEDTheme ? ledColor : defaultColor,
      borderLeftWidth: 16,
      backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#333',
      borderRadius: isLEDTheme ? 0 : 6,
      width: (isTablet ? '50%' : '90%') as DimensionValue,
    });

    const contentContainerStyle = {
      paddingHorizontal: 24,
      paddingVertical: 12,
    };

    const text1Style = {
      color: '#fff',
      fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
      fontSize: RFValue(14),
    };

    const text2Style = {
      color: '#ccc',
      fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
      fontSize: RFValue(11),
    };

    return {
      success: (props: ToastConfigParams<unknown>) => (
        <BaseToast
          {...props}
          style={getToastStyle('#4caf50', '#69c779')}
          contentContainerStyle={contentContainerStyle}
          text1Style={text1Style}
          text2Style={text2Style}
        />
      ),
      error: (props: ToastConfigParams<unknown>) => (
        <ErrorToast
          {...props}
          style={getToastStyle('#f44336', '#fe6161')}
          contentContainerStyle={contentContainerStyle}
          text1Style={text1Style}
          text2Style={text2Style}
        />
      ),
      info: (props: ToastConfigParams<unknown>) => (
        <BaseToast
          {...props}
          style={getToastStyle('#2196f3', '#3498db')}
          contentContainerStyle={contentContainerStyle}
          text1Style={text1Style}
          text2Style={text2Style}
        />
      ),
    };
  }, [isLEDTheme]);

  return <Toast config={toastConfig} />;
};

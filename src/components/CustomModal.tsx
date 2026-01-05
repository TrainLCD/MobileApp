import { Portal } from '@gorhom/portal';
import { useAtomValue } from 'jotai';
import React, { useEffect, useMemo, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  createAnimatedComponent,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { ToastConfigParams } from 'react-native-toast-message';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { FONTS, LED_THEME_BG_COLOR } from '~/constants';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { RFValue } from '~/utils/rfValue';

type Props = {
  visible: boolean;
  children: React.ReactNode;
  onClose?: () => void;
  dismissOnBackdropPress?: boolean;
  backdropStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  animationDuration?: number;
  testID?: string;
  avoidKeyboard?: boolean;
};

const ANIMATION_DURATION = 180;
const AnimatedPressable = createAnimatedComponent(Pressable);

export const CustomModal: React.FC<Props> = ({
  visible,
  children,
  onClose,
  dismissOnBackdropPress = true,
  backdropStyle,
  containerStyle,
  contentContainerStyle,
  animationDuration = ANIMATION_DURATION,
  testID,
  avoidKeyboard = false,
}) => {
  const [isMounted, setIsMounted] = useState(visible);
  const opacity = useSharedValue(visible ? 1 : 0);
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const toastConfig = useMemo(
    () => ({
      success: (props: ToastConfigParams<unknown>) => (
        <BaseToast
          {...props}
          style={{
            borderLeftColor: isLEDTheme ? '#4caf50' : '#69c779',
            borderLeftWidth: 16,
            backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#333',
            borderRadius: isLEDTheme ? 0 : 6,
          }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 12 }}
          text1Style={{
            color: '#fff',
            fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            fontSize: RFValue(14),
          }}
          text2Style={{
            color: '#ccc',
            fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            fontSize: RFValue(11),
          }}
        />
      ),
      error: (props: ToastConfigParams<unknown>) => (
        <ErrorToast
          {...props}
          style={{
            borderLeftColor: isLEDTheme ? '#f44336' : '#fe6161',
            borderLeftWidth: 16,
            backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#333',
            borderRadius: isLEDTheme ? 0 : 6,
          }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 12 }}
          text1Style={{
            color: '#fff',
            fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            fontSize: RFValue(14),
          }}
          text2Style={{
            color: '#ccc',
            fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            fontSize: RFValue(11),
          }}
        />
      ),
      info: (props: ToastConfigParams<unknown>) => (
        <BaseToast
          {...props}
          style={{
            borderLeftColor: isLEDTheme ? '#2196f3' : '#3498db',
            borderLeftWidth: 16,
            backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#333',
            borderRadius: isLEDTheme ? 0 : 6,
          }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 12 }}
          text1Style={{
            color: '#fff',
            fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            fontSize: RFValue(14),
          }}
          text2Style={{
            color: '#ccc',
            fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            fontSize: RFValue(11),
          }}
        />
      ),
    }),
    [isLEDTheme]
  );

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: interpolate(opacity.value, [0, 1], [0.96, 1]) }],
  }));

  useEffect(() => {
    let cancelled = false;

    if (visible) {
      setIsMounted(true);
      opacity.value = withTiming(1, { duration: animationDuration });

      return () => {
        cancelled = true;
        cancelAnimation(opacity);
      };
    }

    opacity.value = withTiming(
      0,
      { duration: animationDuration },
      (finished) => {
        if (finished && !cancelled && !visible) {
          runOnJS(setIsMounted)(false);
        }
      }
    );

    return () => {
      cancelled = true;
      cancelAnimation(opacity);
    };
  }, [animationDuration, opacity, visible]);

  const handleBackdropPress = () => {
    Keyboard.dismiss();
    if (dismissOnBackdropPress) {
      onClose?.();
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Portal>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
        testID={testID}
      >
        <AnimatedPressable
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            backdropStyle,
            animatedBackdropStyle,
          ]}
          onPress={handleBackdropPress}
        />
        <Toast config={toastConfig} />

        {avoidKeyboard ? (
          <KeyboardAvoidingView
            style={[StyleSheet.absoluteFill, styles.center, containerStyle]}
            behavior="padding"
            pointerEvents="box-none"
          >
            <Animated.View
              style={[
                styles.content,
                {
                  borderRadius: isLEDTheme ? 0 : 8,
                },
                contentContainerStyle,
                animatedContentStyle,
              ]}
              pointerEvents="auto"
            >
              {children}
            </Animated.View>
          </KeyboardAvoidingView>
        ) : (
          <View
            style={[StyleSheet.absoluteFill, styles.center, containerStyle]}
            pointerEvents="box-none"
          >
            <Animated.View
              style={[
                styles.content,
                {
                  borderRadius: isLEDTheme ? 0 : 8,
                },
                contentContainerStyle,
                animatedContentStyle,
              ]}
              pointerEvents="auto"
            >
              {children}
            </Animated.View>
          </View>
        )}
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});

export default React.memo(CustomModal);

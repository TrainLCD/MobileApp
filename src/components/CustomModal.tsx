import { Portal } from '@gorhom/portal';
import { useAtomValue } from 'jotai';
import React, { useEffect, useState } from 'react';
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
import { isLEDThemeAtom } from '~/store/atoms/theme';

type Props = {
  visible: boolean;
  children: React.ReactNode;
  onClose?: () => void;
  /** 閉じるアニメーションが完了した後に呼ばれるコールバック */
  onCloseAnimationEnd?: () => void;
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
  onCloseAnimationEnd,
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

    const handleCloseAnimationEnd = () => {
      setIsMounted(false);
      onCloseAnimationEnd?.();
    };

    opacity.value = withTiming(
      0,
      { duration: animationDuration },
      (finished) => {
        if (finished && !cancelled && !visible) {
          runOnJS(handleCloseAnimationEnd)();
        }
      }
    );

    return () => {
      cancelled = true;
      cancelAnimation(opacity);
    };
  }, [animationDuration, opacity, visible, onCloseAnimationEnd]);

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

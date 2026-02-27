import { Portal } from '@gorhom/portal';
import { useAtomValue } from 'jotai';
import React, { useEffect, useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
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
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const animatedBackdropStyle = {
    opacity,
  };
  const animatedContentStyle = {
    opacity,
    transform: [
      {
        scale: opacity.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
      },
    ],
  };

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(opacity, {
      toValue: 0,
      duration: animationDuration,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) {
        setIsMounted(false);
        onCloseAnimationEnd?.();
      }
    });
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
    maxWidth: 640,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});

export default React.memo(CustomModal);

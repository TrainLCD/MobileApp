import { Portal } from '@gorhom/portal';
import { useAtomValue } from 'jotai';
import React, { useEffect, useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Animated,
  type GestureResponderEvent,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import isTablet from '~/utils/isTablet';

type Props = {
  visible: boolean;
  children: React.ReactNode;
  onClose?: () => void;
  /** 閉じるアニメーションが完了した後に呼ばれるコールバック */
  onCloseAnimationEnd?: () => void;
  /** 開くアニメーションが完了した後に呼ばれるコールバック */
  onShow?: () => void;
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
const stopModalTouchPropagation = (event: GestureResponderEvent) => {
  event.stopPropagation();
};

export const CustomModal: React.FC<Props> = ({
  visible,
  children,
  onClose,
  onCloseAnimationEnd,
  onShow,
  dismissOnBackdropPress = true,
  backdropStyle,
  containerStyle,
  contentContainerStyle,
  animationDuration = ANIMATION_DURATION,
  testID,
  avoidKeyboard = false,
}) => {
  const [isMounted, setIsMounted] = useState(visible);
  const contentOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const backdropOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const onShowRef = useRef(onShow);
  const onCloseAnimationEndRef = useRef(onCloseAnimationEnd);
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const animatedBackdropStyle = {
    opacity: backdropOpacity,
  };
  const animatedContentStyle = {
    opacity: contentOpacity,
    transform: [
      {
        scale: contentOpacity.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
      },
    ],
  };

  useEffect(() => {
    onShowRef.current = onShow;
  }, [onShow]);

  useEffect(() => {
    onCloseAnimationEndRef.current = onCloseAnimationEnd;
  }, [onCloseAnimationEnd]);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onShowRef.current?.();
        }
      });
      return;
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && !visible) {
        setIsMounted(false);
        onCloseAnimationEndRef.current?.();
      }
    });
  }, [animationDuration, backdropOpacity, contentOpacity, visible]);

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
              onTouchEnd={stopModalTouchPropagation}
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
              onTouchEnd={stopModalTouchPropagation}
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
    maxWidth: isTablet ? 480 : 400,
    maxHeight: '90%',
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});

export default React.memo(CustomModal);

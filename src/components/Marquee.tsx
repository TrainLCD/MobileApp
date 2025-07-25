import React, { cloneElement, useCallback, useMemo, useRef } from 'react';
import { Dimensions, ScrollView, StyleSheet, type View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  children: React.ReactElement;
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

const PIXELS_PER_SECOND = 400;

const screenWidth = Dimensions.get('screen').width;

const Marquee = ({ children }: Props) => {
  const wrapperViewRef = useRef<View>(null);
  const offsetX = useSharedValue(screenWidth);

  const startScroll = useCallback(
    (width: number) => {
      const totalDistance = screenWidth + width;
      const duration = (totalDistance / PIXELS_PER_SECOND) * 1000;

      offsetX.value = withRepeat(
        withTiming(-width, { duration, easing: Easing.linear }),
        -1
      );
    },
    [offsetX]
  );

  const childrenCloned = useMemo(
    () =>
      cloneElement(children, {
        // biome-ignore lint/suspicious/noExplicitAny: どうしょうもない
        ...(children.props as any),
        style: {
          // biome-ignore lint/suspicious/noExplicitAny: どうしょうもない
          ...(children.props as any).style,
        },
        onLayout: ({
          nativeEvent: {
            layout: { width },
          },
        }: {
          nativeEvent: { layout: { width: number } };
        }) => startScroll(width),
        ref: wrapperViewRef,
      }),
    [children, startScroll]
  );

  const animatedViewStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: offsetX.value,
      },
    ],
  }));

  return (
    <ScrollView
      style={styles.container}
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={false}
      bounces={false}
    >
      <Animated.View style={animatedViewStyle}>{childrenCloned}</Animated.View>
    </ScrollView>
  );
};

export default React.memo(Marquee);

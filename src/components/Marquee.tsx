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

const Marquee = ({ children }: Props) => {
  const wrapperViewRef = useRef<View>(null);
  const offsetX = useSharedValue(Dimensions.get('screen').width);

  const startScroll = useCallback(
    (width: number) => {
      offsetX.value = withRepeat(
        withTiming(-width, { duration: 8500, easing: Easing.linear }),
        -1
      );
    },
    [offsetX]
  );

  const childrenCloned = useMemo(
    () =>
      cloneElement(children, {
        ...children.props,
        style: {
          ...children.props.style,
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
        translateX: offsetX.get(),
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

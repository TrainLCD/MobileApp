import React, {
  cloneElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  type LayoutChangeEvent,
  ScrollView,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  type View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
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

const Marquee = ({ children }: Props) => {
  const dim = useWindowDimensions();

  const wrapperViewRef = useRef<View>(null);
  const offsetX = useSharedValue(dim.width);
  const contentWidthRef = useRef(0);

  const startScroll = useCallback(
    (width: number) => {
      contentWidthRef.current = width;
      // stop previous animation
      cancelAnimation(offsetX);
      // if content fits, no scrolling
      if (width <= dim.width) {
        offsetX.value = 0;
        return;
      }
      // start from right edge and move left beyond the content
      offsetX.value = dim.width;
      const totalDistance = dim.width + width;
      const duration = (totalDistance / PIXELS_PER_SECOND) * 1000;
      offsetX.value = withRepeat(
        withTiming(-width, { duration, easing: Easing.linear }),
        -1
      );
    },
    [dim.width, offsetX]
  );

  const childrenCloned = useMemo(() => {
    type LayoutableProps = {
      style?: StyleProp<ViewStyle>;
      onLayout?: (event: LayoutChangeEvent) => void;
    };
    const { style: childStyle, onLayout: originalOnLayout } =
      children.props as LayoutableProps;

    const handleLayout = (event: LayoutChangeEvent) => {
      const {
        nativeEvent: {
          layout: { width },
        },
      } = event;
      startScroll(width);
      originalOnLayout?.(event);
    };

    const mergedProps = {
      ...(children.props as Record<string, unknown>),
      style: childStyle,
      onLayout: handleLayout,
      ref: wrapperViewRef,
      numberOfLines: 1,
    };

    return cloneElement(children, mergedProps);
  }, [children, startScroll]);

  // restart on rotation or size change
  useEffect(() => {
    const w = contentWidthRef.current;
    if (w > 0) {
      // restart using latest width and dim without depending on startScroll
      cancelAnimation(offsetX);
      if (w <= dim.width) {
        offsetX.value = 0;
      } else {
        offsetX.value = dim.width;
        const totalDistance = dim.width + w;
        const duration = (totalDistance / PIXELS_PER_SECOND) * 1000;
        offsetX.value = withRepeat(
          withTiming(-w, { duration, easing: Easing.linear }),
          -1
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dim.width, offsetX]);

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

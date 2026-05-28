import React, { useCallback, useMemo, useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  StyleSheet,
  Text,
  type TextLayoutEventData,
  type TextProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';

const MEASURE_TEXT_WIDTH = 10000;

type Props = {
  text: string;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
  textProps?: Omit<TextProps, 'children' | 'onLayout' | 'style'>;
  TextComponent?: React.ComponentType<TextProps>;
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    maxWidth: '100%',
  },
  measureText: {
    position: 'absolute',
    opacity: 0,
    width: MEASURE_TEXT_WIDTH,
  },
  scaledText: {
    alignItems: 'center',
    justifyContent: 'center',
    transformOrigin: 'center',
  },
  viewport: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
});

const HeaderStationName: React.FC<Props> = ({
  text,
  containerStyle,
  textStyle,
  textProps,
  TextComponent = Text,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  const handleTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      const measuredWidth = event.nativeEvent.lines.reduce(
        (maxWidth, line) => Math.max(maxWidth, line.width),
        0
      );
      setTextWidth(measuredWidth);
    },
    []
  );

  const handleTextFallbackLayout = useCallback((event: LayoutChangeEvent) => {
    const measuredWidth = event.nativeEvent.layout.width;
    if (measuredWidth < MEASURE_TEXT_WIDTH) {
      setTextWidth(measuredWidth);
    }
  }, []);

  const widthScale = useMemo(() => {
    if (containerWidth <= 0 || textWidth <= 0) {
      return 1;
    }
    return Math.min(1, containerWidth / textWidth);
  }, [containerWidth, textWidth]);

  return (
    <View
      onLayout={handleContainerLayout}
      style={[styles.container, containerStyle]}
    >
      <TextComponent
        {...textProps}
        accessible={false}
        importantForAccessibility={'no-hide-descendants'}
        ellipsizeMode="clip"
        numberOfLines={1}
        onLayout={handleTextFallbackLayout}
        onTextLayout={handleTextLayout}
        style={[textStyle, styles.measureText]}
      >
        {text}
      </TextComponent>
      <View
        style={[
          styles.viewport,
          {
            width: containerWidth || '100%',
          },
        ]}
      >
        <View
          style={[
            styles.scaledText,
            {
              width: textWidth || '100%',
              transform: [{ scaleX: widthScale }],
            },
          ]}
        >
          <TextComponent
            {...textProps}
            ellipsizeMode="clip"
            numberOfLines={1}
            style={textStyle}
          >
            {text}
          </TextComponent>
        </View>
      </View>
    </View>
  );
};

export default React.memo(HeaderStationName);

import { BlurView } from 'expo-blur';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import {
  type LayoutChangeEvent,
  Platform,
  Animated as RNAnimated,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LED_THEME_BG_COLOR } from '~/constants';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import Typography from './Typography';

const styles = StyleSheet.create({
  nowHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    zIndex: 10,
  },
  nowHeaderCard: {
    position: 'relative',
    width: '100%',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
    // iOS shadow
    shadowColor: '#333',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 8 },
  },
  nowHeaderContent: {
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  nowHeaderInline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 10,
  },
  nowBar: {
    marginBottom: 12,
  },
  nowLabel: {
    fontSize: 24,
  },
  nowStation: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  nowStationScaleWrap: {
    alignSelf: 'flex-start',
  },
});

type Props = {
  title: string;
  onLayout?: (event: LayoutChangeEvent) => void;
  scrollY: RNAnimated.Value;
};

export const SettingsHeader = ({ title, onLayout, scrollY }: Props) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const insets = useSafeAreaInsets();

  const COLLAPSE_RANGE = 64;
  const stackedOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const inlineOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE * 0.5, COLLAPSE_RANGE],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const stationScale = scrollY.interpolate({
    inputRange: [0, COLLAPSE_RANGE],
    outputRange: [1, 21 / 32],
    extrapolate: 'clamp',
  });

  const nowHeaderAdditionalStyle: ViewStyle = useMemo(() => {
    const androidBGColor = isLEDTheme
      ? LED_THEME_BG_COLOR
      : 'rgba(250,250,250,0.9)';
    return {
      backgroundColor: Platform.OS === 'android' ? androidBGColor : undefined,
      paddingTop: 32 + insets.top,
    };
  }, [insets.top, isLEDTheme]);

  return (
    <View style={styles.nowHeaderContainer}>
      <View
        style={[
          styles.nowHeaderCard,
          {
            borderBottomLeftRadius: isLEDTheme ? 0 : 16,
            borderBottomRightRadius: isLEDTheme ? 0 : 16,
          },
        ]}
        onLayout={onLayout}
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={40}
            tint={isLEDTheme ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={[styles.nowHeaderContent, nowHeaderAdditionalStyle]}>
          {/* Stacked layout (fades out) */}
          <RNAnimated.View style={{ opacity: stackedOpacity }}>
            <RNAnimated.View
              style={[
                styles.nowStationScaleWrap,
                { transform: [{ scale: stationScale }] },
              ]}
            >
              <Typography
                style={styles.nowStation}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {title}
              </Typography>
            </RNAnimated.View>
          </RNAnimated.View>
          {/* Inline layout (fades in) */}
          <RNAnimated.View
            style={[styles.nowHeaderInline, { opacity: inlineOpacity }]}
          >
            <Typography
              style={styles.nowStation}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {title}
            </Typography>
          </RNAnimated.View>
        </View>
      </View>
    </View>
  );
};

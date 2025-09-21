import { BlurView } from 'expo-blur';
import { useSetAtom } from 'jotai';
import { useCallback, useMemo, useState } from 'react';
import {
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import type { Station } from '~/gen/proto/stationapi_pb';
import { useThemeStore } from '~/hooks';
import { APP_THEME } from '~/models/Theme';
import navigationState from '~/store/atoms/navigation';
import stationState from '~/store/atoms/station';
import { isJapanese } from '~/translation';
import { StationSearchModal } from './StationSearchModal';
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
    backgroundColor: Platform.OS === 'android' ? '#FAFAFA' : undefined,
  },
  nowHeaderCard: {
    width: '100%',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingTop: 32,
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
});

type Props = {
  station: Station;
  onLayout?: (event: LayoutChangeEvent) => void;
  scrollY: SharedValue<number>;
};

export const NowHeader = ({ station, onLayout, scrollY }: Props) => {
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);

  const setStationAtom = useSetAtom(stationState);
  const setNavigationAtom = useSetAtom(navigationState);

  const isLEDTheme = useThemeStore((s) => s === APP_THEME.LED);
  const insets = useSafeAreaInsets();

  const AnimatedTypography = useMemo(
    () => Animated.createAnimatedComponent(Typography),
    []
  );

  const nowHeader = useMemo(() => {
    const label = isJapanese ? 'ただいま' : 'Now at';
    if (!station) return { label, name: '' };
    const re = /\([^()]*\)/g;
    const name = isJapanese
      ? (station.name ?? '').replace(re, '')
      : (station.nameRoman ?? station.name ?? '').replace(re, '');
    return { label, name };
  }, [station]);

  const COLLAPSE_RANGE = 64;
  const stackedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, COLLAPSE_RANGE * 0.5],
      [1, 0],
      'clamp'
    ),
  }));
  const inlineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, COLLAPSE_RANGE * 0.5, COLLAPSE_RANGE],
      [0, 0, 1],
      'clamp'
    ),
  }));
  const animatedStationFont = useAnimatedStyle(() => ({
    fontSize: interpolate(
      scrollY.value,
      [0, COLLAPSE_RANGE],
      [32, 21],
      'clamp'
    ),
  }));

  const handlePress = useCallback(() => {
    setIsSearchModalVisible(true);
  }, []);

  const handleSelectStation = useCallback(
    (station: Station) => {
      setStationAtom((prev) => ({
        ...prev,
        station,
      }));
      setNavigationAtom((prev) => ({
        ...prev,
        stationForHeader: station,
        trainType: null,
        fetchedTrainTypes: [],
      }));
      setIsSearchModalVisible(false);
    },
    [setStationAtom, setNavigationAtom]
  );

  return (
    <>
      <Pressable style={styles.nowHeaderContainer} onPress={handlePress}>
        <View style={styles.nowHeaderCard} onLayout={onLayout}>
          <BlurView
            intensity={40}
            tint={isLEDTheme ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.nowHeaderContent, { paddingTop: insets.top }]}>
            {/* Stacked layout (fades out) */}
            <Animated.View style={stackedStyle}>
              <Typography style={styles.nowLabel}>
                {nowHeader.label ?? ''}
              </Typography>
              {station ? (
                <AnimatedTypography
                  style={[styles.nowStation, animatedStationFont]}
                >
                  {nowHeader.name ?? ''}
                </AnimatedTypography>
              ) : (
                <SkeletonPlaceholder borderRadius={4} speed={1500}>
                  <SkeletonPlaceholder.Item width={128} height={32} />
                </SkeletonPlaceholder>
              )}
            </Animated.View>
            {/* Inline layout (fades in) */}
            <Animated.View style={[inlineStyle, styles.nowHeaderInline]}>
              <Typography style={styles.nowLabel}>
                {nowHeader.label ?? ''}
              </Typography>
              <Typography style={styles.nowStation}>
                {isJapanese
                  ? `${nowHeader.name ?? ''}`
                  : (nowHeader.name ?? '')}
              </Typography>
            </Animated.View>
          </View>
        </View>
      </Pressable>
      <StationSearchModal
        visible={isSearchModalVisible}
        onClose={() => {
          setIsSearchModalVisible(false);
        }}
        onSelect={handleSelectStation}
      />
    </>
  );
};

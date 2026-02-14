import { BlurView } from 'expo-blur';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import type { Station } from '~/@types/graphql';
import { LED_THEME_BG_COLOR } from '~/constants';
import { useLocationPermissionsGranted } from '~/hooks/useLocationPermissionsGranted';
import navigationState from '~/store/atoms/navigation';
import stationState from '~/store/atoms/station';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { isJapanese, translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { StationSearchModal } from './StationSearchModal';
import Typography from './Typography';
import { locationAtom } from '~/store/atoms/location';

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
    fontSize: isTablet ? 32 : 24,
  },
  nowStation: {
    fontSize: isTablet ? 44 : 32,
    fontWeight: 'bold',
  },
});

export type HeaderLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  station: Station | null;
  onLayout?: (event: LayoutChangeEvent) => void;
  onHeaderLayout?: (layout: HeaderLayout) => void;
  scrollY: SharedValue<number>;
};

export const NowHeader = ({
  station,
  onLayout,
  onHeaderLayout,
  scrollY,
}: Props) => {
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const headerCardRef = useRef<View>(null);

  const setStationAtom = useSetAtom(stationState);
  const setNavigationAtom = useSetAtom(navigationState);
  const setLocationAtom = useSetAtom(locationAtom);

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const insets = useSafeAreaInsets();
  const locationPermissionsGranted = useLocationPermissionsGranted();

  const AnimatedTypography = useMemo(
    () => Animated.createAnimatedComponent(Typography),
    []
  );

  const nowHeader = useMemo(() => {
    const label = locationPermissionsGranted
      ? translate('nowAtLabel')
      : translate('welcomeLabel');
    if (!station) return { label, name: '' };
    const re = /\([^()]*\)/g;
    const name = isJapanese
      ? (station.name ?? '').replaceAll(re, '')
      : (station.nameRoman ?? station.name ?? '').replaceAll(re, '');
    return { label, name };
  }, [station, locationPermissionsGranted]);

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
      isTablet ? [44, 32] : [32, 24],
      'clamp'
    ),
  }));

  const handlePress = useCallback(() => {
    setIsSearchModalVisible(true);
  }, []);

  const handleHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onLayout?.(event);
      if (onHeaderLayout && headerCardRef.current) {
        headerCardRef.current.measureInWindow((x, y, width, height) => {
          onHeaderLayout({ x, y, width, height });
        });
      }
    },
    [onLayout, onHeaderLayout]
  );

  const handleSelectStation = useCallback(
    (station: Station) => {
      setStationAtom((prev) => ({
        ...prev,
        station,
        stationsCache: [],
      }));
      setNavigationAtom((prev) => ({
        ...prev,
        stationForHeader: station,
        trainType: null,
        fetchedTrainTypes: [],
      }));
      setLocationAtom({
        coords: {
          latitude: station.latitude as number,
          longitude: station.longitude as number,
          altitude: null,
          accuracy: 0,
          heading: null,
          speed: 0,
          altitudeAccuracy: null,
        },
        timestamp: Date.now(),
      });
      setIsSearchModalVisible(false);
    },
    [setStationAtom, setNavigationAtom, setLocationAtom]
  );

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
    <>
      <Pressable style={styles.nowHeaderContainer} onPress={handlePress}>
        <View
          ref={headerCardRef}
          style={[
            styles.nowHeaderCard,
            {
              borderBottomLeftRadius: isLEDTheme ? 0 : 16,
              borderBottomRightRadius: isLEDTheme ? 0 : 16,
            },
          ]}
          onLayout={handleHeaderLayout}
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
            <Animated.View style={stackedStyle}>
              <Typography style={styles.nowLabel}>
                {nowHeader.label ?? ''}
              </Typography>
              {station ? (
                <AnimatedTypography
                  style={[styles.nowStation, animatedStationFont]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {nowHeader.name ?? ''}
                </AnimatedTypography>
              ) : locationPermissionsGranted ? (
                <SkeletonPlaceholder borderRadius={4} speed={1500}>
                  <SkeletonPlaceholder.Item width={128} height={32} />
                </SkeletonPlaceholder>
              ) : (
                <Typography style={styles.nowStation}>
                  {translate('searchByStationName')}
                </Typography>
              )}
            </Animated.View>
            {/* Inline layout (fades in) */}
            <Animated.View style={[inlineStyle, styles.nowHeaderInline]}>
              <Typography style={styles.nowLabel}>
                {nowHeader.label ?? ''}
              </Typography>
              <Typography
                style={styles.nowStation}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {station
                  ? (nowHeader.name ?? '')
                  : translate('searchByStationName')}
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

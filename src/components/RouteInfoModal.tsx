import { BlurView } from 'expo-blur';
import { useAtomValue } from 'jotai';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import type { Station, TrainType } from '~/@types/graphql';
import { LED_THEME_BG_COLOR } from '~/constants/color';
import lineState from '~/store/atoms/line';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { isJapanese, translate } from '~/translation';
import dropEitherJunctionStation from '~/utils/dropJunctionStation';
import isTablet from '~/utils/isTablet';
import {
  filterBusLinesForNonBusStation,
  getLocalizedLineName,
} from '~/utils/line';
import { RFValue } from '~/utils/rfValue';
import Button from './Button';
import { CommonCard } from './CommonCard';
import { CustomModal } from './CustomModal';
import { EmptyLineSeparator } from './EmptyLineSeparator';
import { Heading } from './Heading';
import { ToggleButton } from './ToggleButton';
import Typography from './Typography';

const HEADER_HEIGHT = Math.ceil(
  24 + RFValue(12) * 1.5 + RFValue(18) * 1.5 + 16
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  contentView: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  boldTypography: {
    fontSize: RFValue(12),
    fontWeight: 'bold',
  },
  headerText: {
    color: '#111',
  },
  closeButtonContainer: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  closeButton: { width: '100%' },
  closeButtonText: { fontWeight: 'bold' },
  headerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    zIndex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    width: '100%',
    marginBottom: 24,
  },
  flatListContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 72,
  },
  noSearchResulText: {
    fontWeight: 'bold',
  },
  expandableToggle: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    paddingHorizontal: 12,
  },
  expandableToggleTextLight: {
    color: '#333',
  },
  expandableToggleTextLED: {
    color: '#fff',
  },
});

type Props = {
  visible: boolean;
  trainType: TrainType | null;
  stations: Station[];
  loading: boolean;
  onSelect?: (station: Station) => void;
  onClose: () => void;
  /** 通知対象の駅IDリスト */
  targetStationIds?: number[];
  /** 通知モードのトグル */
  onToggleNotification?: (station: Station) => void;
  /** 終着駅として設定されている駅のgroupId */
  wantedDestinationGroupId?: number | null;
  /** 終着駅の設定トグル */
  onToggleDestination?: (station: Station) => void;
};

export const RouteInfoModal = ({
  visible,
  trainType,
  stations,
  loading,
  onSelect,
  onClose,
  targetStationIds,
  onToggleNotification,
  wantedDestinationGroupId,
  onToggleDestination,
}: Props) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const { height: windowHeight } = useWindowDimensions();
  const [headerHeight, setHeaderHeight] = useState(HEADER_HEIGHT);

  const { pendingLine } = useAtomValue(lineState);
  const lineName = getLocalizedLineName(pendingLine, isJapanese);
  const trainTypeName = isJapanese
    ? (trainType?.name ?? '普通/各駅停車')
    : (trainType?.nameRoman ?? 'Local');

  const stationSubtitles = useMemo(
    () =>
      new Map(
        stations.map((item) => {
          const lines = filterBusLinesForNonBusStation(item.line, item.lines);
          const subtitle = Array.from(
            new Set(
              (lines ?? [])
                .map((l) => getLocalizedLineName(l, isJapanese))
                .filter(Boolean)
            )
          ).join(isJapanese ? ' ' : ', ');
          return [item.id, subtitle];
        })
      ),
    [stations]
  );

  const hasStationSettings =
    onToggleNotification != null || onToggleDestination != null;
  const [expandedStationId, setExpandedStationId] = useState<number | null>(
    null
  );

  const renderItem = useCallback(
    ({ item }: { item: Station }) => {
      const { line } = item;
      if (!line) return null;

      const title = (isJapanese ? item.name : item.nameRoman) || undefined;
      const subtitle = stationSubtitles.get(item.id) ?? '';
      const isExpanded = expandedStationId === item.id;

      if (hasStationSettings) {
        const isNotifyEnabled =
          targetStationIds?.includes(item.id ?? -1) ?? false;
        const isSetAsTerminus = wantedDestinationGroupId === item.groupId;

        return (
          <CommonCard
            targetStation={item}
            line={line}
            title={title}
            subtitle={subtitle}
            subtitleNumberOfLines={1}
            expanded={isExpanded}
            onExpandedChange={(exp) =>
              setExpandedStationId(exp ? (item.id ?? null) : null)
            }
            expandableContent={
              <>
                {onToggleNotification && (
                  <ToggleButton
                    outline
                    onToggle={() => onToggleNotification(item)}
                    state={isNotifyEnabled}
                    style={styles.expandableToggle}
                    textStyle={
                      isLEDTheme
                        ? styles.expandableToggleTextLED
                        : styles.expandableToggleTextLight
                    }
                    activeOpacity={1}
                  >
                    {translate('enableNotificationMode')}
                  </ToggleButton>
                )}
                {onToggleDestination && (
                  <ToggleButton
                    outline
                    style={styles.expandableToggle}
                    textStyle={
                      isLEDTheme
                        ? styles.expandableToggleTextLED
                        : styles.expandableToggleTextLight
                    }
                    activeOpacity={1}
                    onToggle={() => onToggleDestination(item)}
                    state={isSetAsTerminus}
                  >
                    {translate('setAsTerminus')}
                  </ToggleButton>
                )}
              </>
            }
          />
        );
      }

      return (
        <CommonCard
          targetStation={item}
          line={line}
          title={title}
          subtitle={subtitle}
          onPress={() => onSelect?.(item)}
          subtitleNumberOfLines={1}
        />
      );
    },
    [
      onSelect,
      stationSubtitles,
      hasStationSettings,
      expandedStationId,
      targetStationIds,
      wantedDestinationGroupId,
      onToggleNotification,
      onToggleDestination,
      isLEDTheme,
    ]
  );

  const keyExtractor = useCallback(
    (s: Station, index: number) => `${s.groupId ?? 0}-${s.id ?? index}`,
    []
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const deduppedStations = useMemo(
    () => dropEitherJunctionStation(stations ?? []),
    [stations]
  );

  const dynamicMinHeight = useMemo(() => {
    const count = deduppedStations.length;
    const content = headerHeight + count * 80 + Math.max(0, count - 1) * 8 + 72;
    return Math.min(content, windowHeight * 0.75);
  }, [deduppedStations.length, windowHeight, headerHeight]);

  return (
    <CustomModal
      visible={visible}
      onClose={handleClose}
      backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      containerStyle={styles.root}
      contentContainerStyle={[
        styles.contentView,
        {
          height: dynamicMinHeight,
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
        },
        isTablet && {
          width: '80%',
          maxHeight: '75%',
          borderRadius: 16,
        },
      ]}
    >
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : undefined },
        ]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        {Platform.OS === 'ios' && !isLEDTheme ? (
          <BlurView
            intensity={80}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        ) : Platform.OS === 'android' && !isLEDTheme ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(255,255,255,0.92)' },
            ]}
          />
        ) : null}
        <Typography
          style={[styles.boldTypography, !isLEDTheme && styles.headerText]}
        >
          {lineName}
        </Typography>
        <Heading style={!isLEDTheme ? styles.headerText : undefined}>
          {trainTypeName}
        </Heading>
      </View>

      <FlatList<Station>
        data={deduppedStations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={EmptyLineSeparator}
        scrollEventThrottle={16}
        style={StyleSheet.absoluteFill}
        contentContainerStyle={[
          styles.flatListContentContainer,
          { paddingTop: headerHeight },
        ]}
        scrollIndicatorInsets={{ top: headerHeight, bottom: 72 }}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          loading ? (
            <SkeletonPlaceholder borderRadius={4} speed={1500}>
              <SkeletonPlaceholder.Item width="100%" height={72} />
            </SkeletonPlaceholder>
          ) : null
        }
      />
      <View
        style={[
          styles.closeButtonContainer,
          { backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : undefined },
        ]}
      >
        {Platform.OS === 'ios' && !isLEDTheme ? (
          <BlurView
            intensity={80}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        ) : Platform.OS === 'android' && !isLEDTheme ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(255,255,255,0.92)' },
            ]}
          />
        ) : null}
        <Button
          style={styles.closeButton}
          textStyle={styles.closeButtonText}
          onPress={handleClose}
        >
          {translate('close')}
        </Button>
      </View>
    </CustomModal>
  );
};

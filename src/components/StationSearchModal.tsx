import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import { useAtomValue } from 'jotai';
import uniqBy from 'lodash/uniqBy';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  GetStationsNearbyQueryVariables,
  Station,
} from '~/@types/graphql';
import { LED_THEME_BG_COLOR } from '~/constants/color';
import { PREFECTURES_JA } from '~/constants/province';
import { useAIAgentFeatureEnabled } from '~/hooks/useAIAgentFeatureEnabled';
import { useFetchCurrentLocationOnce } from '~/hooks/useFetchCurrentLocationOnce';
import { useGraphQLQuery } from '~/hooks/useGraphQLQuery';
import { useLazyGraphQLQuery } from '~/hooks/useLazyGraphQLQuery';
import {
  GET_STATIONS_BY_NAME,
  GET_STATIONS_NEARBY,
} from '~/lib/graphql/queries';
import { appColorsAtom } from '~/store/atoms/colorScheme';
import { locationAtom, setLocation } from '~/store/atoms/location';
import { stationAtom } from '~/store/atoms/station';
import { stationResolveFailedAtom } from '~/store/atoms/stationSearchPrompt';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { isJapanese, translate } from '~/translation';
import { showDialogWhilePresenting } from '~/utils/dialogPresentation';
import isTablet from '~/utils/isTablet';
import { filterBusLinesForNonBusStation } from '~/utils/line';
import Button from './Button';
import { CommonCard } from './CommonCard';
import { CustomModal } from './CustomModal';
import { EmptyLineSeparator } from './EmptyLineSeparator';
import { EmptyResult } from './EmptyResult';
import { Heading } from './Heading';
import { SearchBar } from './SearchBar';
import Typography from './Typography';

type GetStationsNearbyData = {
  stationsNearby: Station[];
};

type GetStationsByNameData = {
  stationsByName: Station[];
};

type GetStationsByNameVariables = {
  name: string;
  limit?: number;
  fromStationGroupId?: number;
};

const getStationUniqueKey = (station: Station) => {
  if (station.groupId) {
    return `${station.groupId}|${station.name}`;
  }
  if (station.id) {
    return String(station.id);
  }
  const prefId = station.prefectureId;
  if (!prefId || prefId < 1) {
    return station.name;
  }
  return `${station.name}|${PREFECTURES_JA[prefId - 1]}`;
};

const getUniqueStations = (stations?: Station[]) =>
  uniqBy(stations ?? [], getStationUniqueKey);

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
    paddingVertical: 21,
  },
  title: {
    width: '100%',
    marginBottom: 24,
  },
  titleWithHint: {
    marginBottom: 8,
  },
  hint: {
    width: '100%',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  flatListContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 150,
    paddingBottom: 72,
  },
});

// 現在駅が無いときのヒント(最大2行)ぶんだけヘッダーを広げる。
// title の marginBottom を 24→8 に詰め、hint(16*2) + marginBottom(16) を足した差分
const HINT_EXTRA_HEIGHT = 40;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (trainType: Station) => void;
};

export const StationSearchModal = ({ visible, onClose, onSelect }: Props) => {
  // contentContainerStyle は Portal の外側で組み立てるため Context が届かない。
  // 自身の配色は atom から直接読む(子孫は CustomModal 側の Provider が面倒を見る)。
  const colors = useAtomValue(appColorsAtom);
  const { height: windowHeight } = useWindowDimensions();
  const { fetchCurrentLocation } = useFetchCurrentLocationOnce();
  const wasVisibleRef = useRef(false);
  const location = useAtomValue(locationAtom);
  const [modalCoords, setModalCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const latitude = modalCoords?.latitude ?? location?.coords.latitude;
  const longitude = modalCoords?.longitude ?? location?.coords.longitude;

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const insets = useSafeAreaInsets();
  const aiEnabled = useAIAgentFeatureEnabled();
  const currentStation = useAtomValue(stationAtom);
  // 現在駅が無いまま開いたときは、選ぶと何が使えるようになるかを添える
  const showHint = !currentStation?.groupId;
  const stationResolveFailed = useAtomValue(stationResolveFailedAtom);
  // 位置情報が取れず手動で駅を選びに来たときは、開くたびに位置情報を取り直さない。
  // 取り直すと端末の位置情報設定のダイアログが再び出て、断った直後の操作を妨げる。
  // 再取得は路線選択画面の「位置情報を再取得」から明示的に行う
  const skipLocationRefresh = showHint && stationResolveFailed;
  const headerHeight = 150 + (showHint ? HINT_EXTRA_HEIGHT : 0);

  const {
    data: stationsNearbyData,
    loading: fetchStationsNearbyLoading,
    error: fetchStationsNearbyError,
  } = useGraphQLQuery<GetStationsNearbyData>(GET_STATIONS_NEARBY, {
    skip: !visible || latitude == null || longitude == null,
    variables: {
      latitude: latitude as number,
      longitude: longitude as number,
      limit: 10,
    } as GetStationsNearbyQueryVariables,
  });

  const [
    fetchStationsByName,
    {
      data: stationsByNameData,
      loading: fetchStationsByNameLoading,
      error: fetchStationsByNameError,
      called: fetchStationsByNameCalled,
    },
  ] = useLazyGraphQLQuery<GetStationsByNameData, GetStationsByNameVariables>(
    GET_STATIONS_BY_NAME
  );

  useEffect(() => {
    if (!visible) {
      setModalCoords(null);
      wasVisibleRef.current = false;
      return;
    }
    if (wasVisibleRef.current) return;
    wasVisibleRef.current = true;
    if (skipLocationRefresh) return;

    let active = true;
    const refreshLocation = async () => {
      try {
        const currentLocation = await fetchCurrentLocation();
        if (!active) return;
        setModalCoords({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
        setLocation(currentLocation);
      } catch (error) {
        console.error(error);
      }
    };

    refreshLocation();
    return () => {
      active = false;
    };
  }, [visible, fetchCurrentLocation, skipLocationRefresh]);

  useEffect(() => {
    if (fetchStationsByNameError || fetchStationsNearbyError) {
      // StrictMode の二重実行でダイアログが重複しないよう共有ガードを使う
      showDialogWhilePresenting(
        'stationSearchModalFetchError',
        translate('errorTitle'),
        translate('failedToFetchStation')
      );
    }
  }, [fetchStationsByNameError, fetchStationsNearbyError]);

  const renderItem = useCallback(
    ({ item }: { item: Station }) => {
      const { line, lines: linesRaw } = item;
      const lines = filterBusLinesForNonBusStation(line, linesRaw);
      if (!line) return null;

      const title = (isJapanese ? item.name : item.nameRoman) || undefined;
      const subtitle = isJapanese
        ? Array.from(new Set((lines ?? []).map((l) => l.nameShort))).join(' ')
        : Array.from(new Set((lines ?? []).map((l) => l.nameRoman))).join(', ');

      return (
        <CommonCard
          targetStation={item}
          line={line}
          title={title}
          subtitle={subtitle}
          subtitleNumberOfLines={1}
          onPress={() => {
            onSelect(item);
          }}
        />
      );
    },
    [onSelect]
  );

  const keyExtractor = useCallback(
    (s: Station, index: number) => `${s.groupId ?? 0}-${s.id ?? index}`,
    []
  );

  const handleSearchStations = useCallback(
    (query: string) => {
      if (!query.trim().length) {
        return;
      }

      fetchStationsByName({ variables: { name: query } });
    },
    [fetchStationsByName]
  );

  const isLoading = fetchStationsByNameLoading || fetchStationsNearbyLoading;

  const stations = useMemo(
    () =>
      isLoading
        ? []
        : fetchStationsByNameCalled
          ? getUniqueStations(stationsByNameData?.stationsByName)
          : getUniqueStations(stationsNearbyData?.stationsNearby),
    [
      stationsNearbyData?.stationsNearby,
      stationsByNameData?.stationsByName,
      fetchStationsByNameCalled,
      isLoading,
    ]
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // ヘッダー(150) + アイテム(80*件数) + セパレーター(8*(件数-1)) + フッター(72)
  const dynamicMinHeight = useMemo(() => {
    // ローディング中・エラー時はSkeleton2つ分の高さを最低限確保
    const count = Math.max(isLoading ? 2 : 0, stations?.length ?? 0);
    const content = headerHeight + count * 80 + Math.max(0, count - 1) * 8 + 72;
    return Math.min(
      Math.max(content, 390 + (showHint ? HINT_EXTRA_HEIGHT : 0)),
      windowHeight * 0.75
    );
  }, [stations?.length, windowHeight, isLoading, headerHeight, showHint]);

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
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : colors.card,
          marginBottom: insets.bottom || 0,
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
      >
        {Platform.OS === 'ios' && !isLEDTheme ? (
          <BlurView
            intensity={80}
            tint={colors.blurTint}
            style={StyleSheet.absoluteFill}
          />
        ) : Platform.OS === 'android' && !isLEDTheme ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.modalHeaderBackground },
            ]}
          />
        ) : null}
        <Heading
          style={[
            styles.title,
            showHint && styles.titleWithHint,
            !isLEDTheme && { color: colors.modalHeadingText },
          ]}
        >
          {translate('searchByStationName')}
        </Heading>
        {showHint ? (
          <Typography
            numberOfLines={2}
            style={[styles.hint, { color: colors.secondaryText }]}
          >
            {translate(
              aiEnabled
                ? 'currentStationPromptSubtitle'
                : 'currentStationPromptSubtitleNoAI'
            )}
          </Typography>
        ) : null}
        <SearchBar onSearch={handleSearchStations} nameSearch />
      </View>

      <FlashList<Station>
        style={StyleSheet.absoluteFill}
        data={stations ?? []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={EmptyLineSeparator}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.flatListContentContainer,
          { paddingTop: headerHeight },
        ]}
        scrollIndicatorInsets={{ top: headerHeight, bottom: 72 }}
        ListEmptyComponent={
          <EmptyResult
            loading={fetchStationsNearbyLoading || fetchStationsByNameLoading}
            hasSearched={fetchStationsByNameCalled}
          />
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
            tint={colors.blurTint}
            style={StyleSheet.absoluteFill}
          />
        ) : Platform.OS === 'android' && !isLEDTheme ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.modalHeaderBackground },
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

import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import { useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Station } from '~/@types/graphql';
import { LED_THEME_BG_COLOR } from '~/constants/color';
import { appColorsAtom } from '~/store/atoms/colorScheme';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { isJapanese, translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import {
  buildRouteListItem,
  type ConnectedRoute,
  type RouteListItem,
} from '~/utils/routeSearch';
import Button from './Button';
import { CommonCard } from './CommonCard';
import { CustomModal } from './CustomModal';
import { EmptyLineSeparator } from './EmptyLineSeparator';
import { Heading } from './Heading';

/** ヘッダー・フッターの高さ（リストはこの下に潜って描画される）。TrainTypeListModal と揃える */
const HEADER_HEIGHT = 72;

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
    height: HEADER_HEIGHT,
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
    height: HEADER_HEIGHT,
    zIndex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  subtitle: {
    width: '100%',
    fontSize: RFValue(12),
  },
  title: {
    width: '100%',
  },
  flatListContentContainer: {
    paddingHorizontal: 24,
    paddingTop: HEADER_HEIGHT,
    paddingBottom: HEADER_HEIGHT,
  },
});

type RouteRow = RouteListItem & { index: number };

type Props = {
  visible: boolean;
  routes: ConnectedRoute[];
  /** 見出しに出す探している駅 */
  destination?: Station | null;
  loading?: boolean;
  onClose: () => void;
  onSelect: (index: number) => void;
};

export const RouteListModal = ({
  visible,
  routes,
  destination,
  loading,
  onClose,
  onSelect,
}: Props) => {
  const { height: windowHeight } = useWindowDimensions();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAtomValue(appColorsAtom);

  const title = useMemo(() => {
    const headerLine = destination?.line;
    return (isJapanese ? headerLine?.nameShort : headerLine?.nameRoman) ?? '';
  }, [destination?.line]);
  const subtitle = useMemo(() => {
    if (!destination) {
      return translate('route');
    }
    return isJapanese
      ? `${destination.name ?? ''}方面`
      : `${destination.nameRoman ?? ''}`;
  }, [destination]);

  const rows = useMemo<RouteRow[]>(
    () =>
      routes.map((route, index) => ({
        ...buildRouteListItem(route, isJapanese),
        index,
      })),
    [routes]
  );

  const renderItem = useCallback(
    ({ item }: { item: RouteRow }) =>
      item.line ? (
        <CommonCard
          targetStation={item.boardingStation ?? undefined}
          line={item.line}
          title={item.title}
          subtitle={item.subtitle}
          loading={loading}
          onPress={() => onSelect(item.index)}
        />
      ) : null,
    [loading, onSelect]
  );

  const keyExtractor = useCallback((row: RouteRow) => row.index.toString(), []);

  // ヘッダー + アイテム(80*件数) + セパレーター(8*(件数-1)) + フッター
  const dynamicMinHeight = useMemo(
    () =>
      Math.min(
        HEADER_HEIGHT +
          rows.length * 80 +
          Math.max(0, rows.length - 1) * 8 +
          HEADER_HEIGHT,
        windowHeight * 0.75
      ),
    [rows.length, windowHeight]
  );

  const headerBackground =
    Platform.OS === 'ios' && !isLEDTheme ? (
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
    ) : null;

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      containerStyle={styles.root}
      contentContainerStyle={[
        styles.contentView,
        {
          height: dynamicMinHeight,
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : colors.card,
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
          { backgroundColor: isLEDTheme ? '#212121' : undefined },
        ]}
      >
        {headerBackground}
        {title ? (
          <Heading
            singleLine
            style={[
              styles.subtitle,
              !isLEDTheme && { color: colors.modalHeadingText },
            ]}
          >
            {title}
          </Heading>
        ) : null}
        <Heading
          style={[
            styles.title,
            !isLEDTheme && { color: colors.modalHeadingText },
          ]}
        >
          {subtitle}
        </Heading>
      </View>

      <FlashList<RouteRow>
        style={StyleSheet.absoluteFill}
        data={rows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={EmptyLineSeparator}
        scrollEventThrottle={16}
        contentContainerStyle={styles.flatListContentContainer}
        scrollIndicatorInsets={{ top: HEADER_HEIGHT, bottom: HEADER_HEIGHT }}
      />
      <View
        style={[
          styles.closeButtonContainer,
          { backgroundColor: isLEDTheme ? '#212121' : undefined },
        ]}
      >
        {headerBackground}
        <Button
          style={styles.closeButton}
          textStyle={styles.closeButtonText}
          onPress={onClose}
        >
          {translate('close')}
        </Button>
      </View>
    </CustomModal>
  );
};

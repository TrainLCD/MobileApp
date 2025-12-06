import { useAtomValue } from 'jotai';
import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import type { Station, TrainType } from '~/@types/graphql';
import { LED_THEME_BG_COLOR } from '~/constants/color';
import { useThemeStore } from '~/hooks';
import { APP_THEME } from '~/models/Theme';
import lineState from '~/store/atoms/line';
import { isJapanese, translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import Button from './Button';
import { CommonCard } from './CommonCard';
import { CustomModal } from './CustomModal';
import { EmptyLineSeparator } from './EmptyLineSeparator';
import { Heading } from './Heading';
import Typography from './Typography';

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
    minHeight: 512,
    overflow: 'hidden',
  },
  boldTypography: {
    fontSize: RFValue(12),
    fontWeight: 'bold',
  },
  closeButtonContainer: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
  },
  subtitle: { width: '100%', fontSize: 16 },
  title: {
    width: '100%',
    marginBottom: 24,
  },
  flatList: {
    marginTop: 96,
    marginBottom: 72,
    maxHeight: 480,
  },
  flatListContentContainer: {
    paddingHorizontal: 24,
  },
  noSearchResulText: {
    fontWeight: 'bold',
  },
});

type Props = {
  visible: boolean;
  trainType: TrainType | null;
  stations: Station[];
  loading: boolean;
  onSelect?: (station: Station) => void;
  onClose: () => void;
};

export const RouteInfoModal = ({
  visible,
  trainType,
  stations,
  loading,
  onSelect,
  onClose,
}: Props) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const { pendingLine } = useAtomValue(lineState);
  const lineName = isJapanese
    ? (pendingLine?.nameShort ?? '')
    : (pendingLine?.nameRoman ?? '');
  const trainTypeName = isJapanese
    ? (trainType?.name ?? '普通/各駅停車')
    : (trainType?.nameRoman ?? 'Local');

  const renderItem = useCallback(
    ({ item }: { item: Station }) => {
      const { line, lines } = item;
      if (!line) return null;

      const title = (isJapanese ? item.name : item.nameRoman) || undefined;
      const subtitle = isJapanese
        ? Array.from(new Set((lines ?? []).map((l) => l.nameShort))).join('・')
        : Array.from(new Set((lines ?? []).map((l) => l.nameRoman))).join(', ');

      return (
        <CommonCard
          targetStation={item}
          line={line}
          title={title}
          subtitle={subtitle}
          onPress={() => onSelect?.(item)}
        />
      );
    },
    [onSelect]
  );

  const keyExtractor = useCallback(
    (s: Station, index: number) => `${s.groupId ?? 0}-${s.id ?? index}`,
    []
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <CustomModal
      visible={visible}
      onClose={handleClose}
      backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      containerStyle={styles.root}
      contentContainerStyle={[
        styles.contentView,
        {
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
        },
        isTablet && {
          width: '80%',
          maxHeight: '90%',
          borderRadius: 16,
        },
      ]}
    >
      <View style={styles.headerContainer}>
        <Typography style={styles.boldTypography}>{lineName}</Typography>
        <Heading>{trainTypeName}</Heading>
      </View>

      <FlatList<Station>
        data={stations ?? []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={EmptyLineSeparator}
        scrollEventThrottle={16}
        contentContainerStyle={styles.flatListContentContainer}
        style={styles.flatList}
        ListEmptyComponent={
          loading ? (
            <SkeletonPlaceholder borderRadius={4} speed={1500}>
              <SkeletonPlaceholder.Item width="100%" height={72} />
            </SkeletonPlaceholder>
          ) : null
        }
      />
      <View style={styles.closeButtonContainer}>
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

import uniqBy from 'lodash/uniqBy';
import { useCallback, useMemo } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { LED_THEME_BG_COLOR } from '~/constants/color';
import type { Line, Station, TrainType } from '~/gen/proto/stationapi_pb';
import { useThemeStore } from '~/hooks';
import { APP_THEME } from '~/models/Theme';
import { isJapanese, translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import Button from './Button';
import { EmptyLineSeparator } from './EmptyLineSeparator';
import { Heading } from './Heading';
import { LineCard } from './LineCard';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 24,
  },
  contentView: {
    width: '100%',
    borderRadius: 8,
    minHeight: 512,
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
    height: 72,
    zIndex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  subtitle: { width: '100%', textAlign: 'left', fontSize: 16 },
  title: {
    width: '100%',
    textAlign: 'left',
  },
  flatListContentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 72,
  },
});

type Props = {
  visible: boolean;
  line: Line | null;
  destination?: Station | null;
  trainTypes: TrainType[];
  loading?: boolean;
  onClose: () => void;
  onSelect: (trainType: TrainType) => void;
};

export const TrainTypeListModal = ({
  visible,
  line,
  destination,
  trainTypes,
  loading,
  onClose,
  onSelect,
}: Props) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);
  const title = useMemo(() => {
    if (!destination) {
      return (isJapanese ? line?.nameShort : line?.nameRoman) ?? '';
    }

    return isJapanese
      ? `${destination.name ?? ''}方面`
      : `${destination.nameRoman ?? ''}`;
  }, [destination, line?.nameRoman, line?.nameShort]);
  const subtitle = useMemo(() => {
    if (!destination) {
      return '';
    }

    return isJapanese ? `${line?.nameShort ?? ''}` : `${line?.nameRoman ?? ''}`;
  }, [destination, line?.nameRoman, line?.nameShort]);

  const renderItem = useCallback(
    ({ item }: { item: TrainType }) => {
      const line = item.line;
      const lines = uniqBy(item.lines, 'id');

      if (!line) return null;

      const title = `${isJapanese ? item.name : item.nameRoman}`;
      const subtitle = isJapanese
        ? `${lines.map((l) => l.nameShort).join('・')}${destination ? '経由' : ''}`
        : `${destination ? 'Via ' : ''}${lines.map((l) => l.nameRoman).join(', ')}`;

      return (
        <LineCard
          line={line}
          title={title}
          subtitle={subtitle}
          onPress={() => onSelect(item)}
        />
      );
    },
    [destination, onSelect]
  );

  const keyExtractor = useCallback((tt: TrainType) => tt.id.toString(), []);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <Pressable style={styles.root} onPress={onClose}>
        <Pressable
          style={[
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
            {destination ? (
              <Heading style={styles.subtitle}>{subtitle}</Heading>
            ) : null}
            <Heading style={styles.title}>{title}</Heading>
          </View>

          <FlatList<TrainType>
            style={StyleSheet.absoluteFill}
            data={trainTypes}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ItemSeparatorComponent={EmptyLineSeparator}
            scrollEventThrottle={16}
            contentContainerStyle={styles.flatListContentContainer}
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
              onPress={onClose}
            >
              {translate('close')}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

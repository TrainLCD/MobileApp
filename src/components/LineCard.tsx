import type React from 'react';
import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { Path, Svg } from 'react-native-svg';
import type { Line, Station } from '~/gen/proto/stationapi_pb';
import { NUMBERING_ICON_SIZE } from '../constants';
import { useBounds, useGetLineMark, useThemeStore } from '../hooks';
import { APP_THEME } from '../models/Theme';
import { isJapanese } from '../translation';
import TransferLineMark from './TransferLineMark';
import Typography from './Typography';

type Props = {
  line: Line;
  stations?: Station[];
  title?: string;
  subtitle?: string;
  disabled?: boolean;
  testID?: string;
  onPress?: () => void;
};

const styles = StyleSheet.create({
  root: {
    height: 72,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#333',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  insetBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    borderColor: '#fff',
    borderWidth: 1,
  },
  mark: {
    width: 35,
    height: 35,
    marginRight: 12,
  },
  markPlaceholder: {
    width: 35,
    height: 35,
    marginRight: 12,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    opacity: 0.9,
    lineHeight: 16,
    // Android のベースライン差異を吸収
    includeFontPadding: false,
  },
  subtitleContainer: {
    height: 16,
    // 横方向は左揃え（縦は subtitleRow の alignItems で中央揃え）
    justifyContent: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    width: 24,
    height: 24,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

type SubtitleProps = {
  inboundText: string;
  outboundText: string;
  loading?: boolean;
};

const Subtitle = ({ inboundText, outboundText, loading }: SubtitleProps) => {
  if (loading) {
    return (
      <View style={[styles.subtitleContainer, { marginTop: 6 }]}>
        <SkeletonPlaceholder borderRadius={1} speed={1500}>
          <SkeletonPlaceholder.Item width={60} height={12} />
        </SkeletonPlaceholder>
      </View>
    );
  }

  return (
    <View style={[styles.subtitleContainer, { marginTop: 6 }]}>
      {inboundText ? (
        <Typography style={styles.subtitle} numberOfLines={1}>
          {inboundText}
        </Typography>
      ) : null}
      {inboundText && outboundText ? (
        <Svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          style={{ marginHorizontal: 6, alignSelf: 'center' }}
        >
          <Path
            d="M5 12h14M5 12l3-3M5 12l3 3M19 12l-3-3M19 12l-3 3"
            fill="none"
            stroke="#fff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
      {outboundText ? (
        <Typography style={styles.subtitle} numberOfLines={1}>
          {outboundText}
        </Typography>
      ) : null}
    </View>
  );
};

export const LineCard: React.FC<Props> = ({
  line,
  stations = [],
  title,
  subtitle,
  disabled,
  testID,
  onPress,
}) => {
  const isLEDTheme = useThemeStore((s) => s === APP_THEME.LED);
  const getLineMark = useGetLineMark();
  const mark = useMemo(() => getLineMark({ line }), [getLineMark, line]);
  const { bounds } = useBounds(stations);

  const [inboundText, outboundText] = useMemo(() => {
    if (!stations || !stations.length) {
      // フォールバックは何も表示しない
      return ['', ''];
    }
    const format = (arr: Station[]): string => {
      const ja = arr
        .slice(0, 2)
        .map((s) => s.name)
        .filter(Boolean)
        .join('・');
      const en = arr
        .slice(0, 2)
        .map((s) => s.nameRoman || s.name)
        .filter(Boolean)
        .join(' & ');
      if (isJapanese) return ja ? `${ja}方面` : '';
      return en ? `for ${en}` : '';
    };

    const [inbound, outbound] = bounds;
    return [format(inbound), format(outbound)];
  }, [bounds, stations]);

  const titleOrLineName = useMemo(
    () => title ?? line.nameShort ?? line.nameRoman ?? '',
    [title, line.nameShort, line.nameRoman]
  );

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={1}
      disabled={disabled}
      testID={testID}
      style={[
        styles.root,
        {
          backgroundColor: line.color ?? '#333',
          opacity: disabled ? 0.5 : 1,
          borderWidth: 0,
        },
      ]}
    >
      <View style={styles.insetBorder} pointerEvents="none" />
      {mark ? (
        <View style={styles.mark}>
          <TransferLineMark
            line={line}
            mark={mark}
            size={NUMBERING_ICON_SIZE.MEDIUM}
            withOutline
            withDarkTheme={isLEDTheme}
          />
        </View>
      ) : (
        <View style={styles.markPlaceholder} />
      )}
      <View style={styles.texts}>
        <Typography style={styles.title} numberOfLines={1}>
          {titleOrLineName}
        </Typography>
        {subtitle ? (
          <Subtitle inboundText={subtitle} outboundText="" />
        ) : (
          <Subtitle inboundText={inboundText} outboundText={outboundText} />
        )}
      </View>
      <View style={styles.chevron}>
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Path
            d="M8 5l8 7-8 7"
            fill="none"
            stroke="#fff"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </TouchableOpacity>
  );
};

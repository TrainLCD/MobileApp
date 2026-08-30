import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import type { Station } from '~/@types/graphql';
import {
  useDisplayCurrentStation,
  useEstimateArrivalTimes,
  useEstimatedMinutesByStationId,
  useLandscapeWindowDimensions,
  useTransferLinesFromStation,
} from '~/hooks';
import { isEnAtom } from '~/store/selectors/isEn';
import {
  FONTS,
  LOW_POWER_BASE_HEIGHT,
  LOW_POWER_THEME_COLORS,
} from '../constants';
import { headerStateAtom } from '../store/atoms/navigation';
import { arrivedAtom } from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import Typography from './Typography';

const { background, primary, secondary, muted, accent } =
  LOW_POWER_THEME_COLORS;

/** 乗換路線記号を並べる上限。あふれた分は「+N」に畳む */
const MAX_TRANSFER_SYMBOLS = 2;

type Metrics = {
  scale: number;
  hairline: number;
  markerRowHeight: number;
  markRowHeight: number;
  etaRowHeight: number;
  nameRowHeight: number;
  chipRowHeight: number;
  markSize: number;
};

type ColumnProps = {
  station: Station;
  metrics: Metrics;
  isEn: boolean;
  /** 列車が今いる駅 */
  isCurrent: boolean;
  /** 次に停まる駅 */
  isNext: boolean;
  /** 現在位置より手前(通過済み) */
  isBehind: boolean;
  /** 到着まで何分か。現在駅や取得できない駅では null */
  minutes: number | null;
  /** 到着分の単位。先頭列だけ見出しとして単位を出す */
  unitLabel: string;
};

const StationColumn: React.FC<ColumnProps> = ({
  station,
  metrics,
  isEn,
  isCurrent,
  isNext,
  isBehind,
  minutes,
  unitLabel,
}) => {
  const transferLines = useTransferLinesFromStation(station, { omitJR: true });
  const { scale, hairline, markSize } = metrics;

  // 停車しない駅はマークを小さく描いて、停まる駅と形で見分けられるようにする
  const isPassStation = getIsPass(station);

  const mark = useMemo(() => {
    if (isCurrent) {
      return {
        size: markSize,
        backgroundColor: accent,
        borderColor: accent,
        borderWidth: 2 * scale,
      };
    }
    if (isNext) {
      return {
        size: markSize,
        backgroundColor: background,
        borderColor: primary,
        borderWidth: 3 * scale,
      };
    }
    if (isBehind) {
      return {
        size: markSize,
        backgroundColor: muted,
        borderColor: muted,
        borderWidth: 2 * scale,
      };
    }
    return {
      size: isPassStation ? markSize * 0.6 : markSize,
      backgroundColor: background,
      borderColor: muted,
      borderWidth: (isPassStation ? 1 : 2) * scale,
    };
  }, [isBehind, isCurrent, isNext, isPassStation, markSize, scale]);

  const nameColor = useMemo(() => {
    if (isBehind) {
      return muted;
    }
    if (isCurrent || isNext) {
      return primary;
    }
    return isPassStation ? muted : secondary;
  }, [isBehind, isCurrent, isNext, isPassStation]);

  const chips = useMemo(() => {
    if (!transferLines.length) {
      return [];
    }
    const symbols = transferLines
      .map((line) => line.lineSymbols?.[0]?.symbol)
      .filter((symbol): symbol is string => !!symbol)
      .slice(0, MAX_TRANSFER_SYMBOLS);
    const rest = transferLines.length - symbols.length;
    return rest > 0 ? [...symbols, `+${rest}`] : symbols;
  }, [transferLines]);

  const etaText = minutes != null ? String(Math.round(minutes)) : unitLabel;

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ height: metrics.markerRowHeight }} />
      <View
        style={{
          height: metrics.markRowHeight,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: mark.size,
            height: mark.size,
            backgroundColor: mark.backgroundColor,
            borderColor: mark.borderColor,
            borderWidth: mark.borderWidth,
          }}
        />
      </View>
      <Typography
        numberOfLines={1}
        style={{
          height: metrics.etaRowHeight,
          color: minutes != null ? secondary : muted,
          fontFamily: FONTS.RobotoBold,
          fontSize: 14 * scale,
          lineHeight: metrics.etaRowHeight,
        }}
      >
        {etaText}
      </Typography>
      <Typography
        numberOfLines={2}
        style={{
          height: metrics.nameRowHeight,
          paddingTop: 6 * scale,
          paddingHorizontal: 2 * scale,
          textAlign: 'center',
          color: nameColor,
          fontSize: (isEn ? 12 : 15) * scale,
          lineHeight: (isEn ? 14 : 17) * scale,
          fontWeight: isCurrent || isNext ? 'bold' : 'normal',
        }}
      >
        {(isEn ? station.nameRoman : station.name) ?? ''}
      </Typography>
      <View
        style={{
          height: metrics.chipRowHeight,
          flexDirection: 'row',
          gap: 3 * scale,
        }}
      >
        {chips.map((chip) => (
          <Typography
            key={`${station.id}:${chip}`}
            numberOfLines={1}
            style={{
              minWidth: 16 * scale,
              borderWidth: hairline,
              borderColor: secondary,
              color: secondary,
              fontFamily: FONTS.RobotoBold,
              fontSize: 10 * scale,
              lineHeight: 14 * scale,
              paddingHorizontal: 2 * scale,
              textAlign: 'center',
            }}
          >
            {chip}
          </Typography>
        ))}
      </View>
    </View>
  );
};

export type Props = {
  stations: Station[];
};

/**
 * 低消費電力テーマ(#3697)の停車駅ストリップ。
 *
 * 既存テーマの斜め書き(-55°)は低解像度でいちばん潰れるため使わず、駅名を
 * 水平に置いて可読性を優先する。点滅シェブロンの代わりに、列車位置は
 * 動かない三角形ひとつで示す。
 */
const LineBoardLowPower: React.FC<Props> = ({ stations }: Props) => {
  const dim = useLandscapeWindowDimensions();
  const arrived = useAtomValue(arrivedAtom);
  const headerState = useAtomValue(headerStateAtom);
  const isEn = useAtomValue(isEnAtom);
  const currentStation = useDisplayCurrentStation();
  const { route: estimatedRoute } = useEstimateArrivalTimes();
  const estimatedMinutesByStationId =
    useEstimatedMinutesByStationId(estimatedRoute);

  const scale = dim.height / LOW_POWER_BASE_HEIGHT;

  const metrics = useMemo<Metrics>(
    () => ({
      scale,
      hairline: Math.max(1, scale),
      markerRowHeight: 16 * scale,
      markRowHeight: 16 * scale,
      etaRowHeight: 16 * scale,
      nameRowHeight: 40 * scale,
      chipRowHeight: 18 * scale,
      markSize: 14 * scale,
    }),
    [scale]
  );

  const currentIndex = useMemo(() => {
    const index = stations.findIndex(
      (s) => s.groupId === currentStation?.groupId
    );
    return index < 0 ? 0 : index;
  }, [currentStation?.groupId, stations]);

  // 停車中は現在駅の真上、走行中は次駅寄りへ寄せる。接近中はさらに次駅へ近づける
  const markerLeft = useMemo<`${number}%`>(() => {
    if (!stations.length) {
      return '0%';
    }
    const segment = 100 / stations.length;
    const center = segment * (currentIndex + 0.5);
    if (arrived) {
      return `${center}%`;
    }
    const progress = headerState.startsWith('ARRIVING') ? 0.88 : 0.45;
    return `${Math.min(center + segment * progress, 100)}%`;
  }, [arrived, currentIndex, headerState, stations.length]);

  if (!stations.length) {
    return <View style={{ flex: 1, backgroundColor: background }} />;
  }

  const unitLabel = isEn ? 'min.' : '分';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: background,
        paddingTop: 6 * scale,
        paddingBottom: 4 * scale,
        paddingHorizontal: 16 * scale,
      }}
    >
      <View style={{ flex: 1 }}>
        <View
          testID="low-power-line-board-track"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: metrics.markerRowHeight + metrics.markRowHeight / 2 - scale,
            height: 2 * scale,
            backgroundColor: muted,
          }}
        />
        <View
          testID="low-power-line-board-marker"
          style={{
            position: 'absolute',
            top: 2 * scale,
            left: markerLeft,
            width: 0,
            height: 0,
            marginLeft: -7 * scale,
            borderLeftWidth: 7 * scale,
            borderRightWidth: 7 * scale,
            borderTopWidth: 12 * scale,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: accent,
          }}
        />
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {stations.map((station, index) => (
            <StationColumn
              key={station.id}
              station={station}
              metrics={metrics}
              isEn={isEn}
              isCurrent={index === currentIndex}
              isNext={index === currentIndex + 1}
              isBehind={index < currentIndex}
              minutes={
                station.id != null
                  ? (estimatedMinutesByStationId.get(station.id) ?? null)
                  : null
              }
              unitLabel={index === 0 ? unitLabel : ''}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

export default React.memo(LineBoardLowPower);

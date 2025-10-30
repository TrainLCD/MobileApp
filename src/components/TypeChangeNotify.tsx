import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Line, StopCondition, type TrainType } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants';
import {
  useCurrentLine,
  useCurrentStation,
  useCurrentTrainType,
  useNextTrainType,
  useThemeStore,
} from '~/hooks';
import { RFValue } from '~/utils/rfValue';
import { getIsLocal } from '~/utils/trainTypeString';
import stationState from '../store/atoms/station';
import isTablet from '../utils/isTablet';
import truncateTrainType from '../utils/truncateTrainType';
import { BarTerminalEast } from './BarTerminalEast';
import { BarTerminalSaikyo } from './BarTerminalSaikyo';
import Typography from './Typography';

const edgeOffset = isTablet ? 100 : 70;
const barTerminalWidth = isTablet ? 41 : 27;
const barHeight = isTablet ? 48 : 32;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  top: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headingJa: {
    fontSize: isTablet ? RFValue(24) : RFValue(21),
    lineHeight: isTablet ? RFValue(24) : RFValue(21),
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#212121',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  trainTypeText: {
    fontWeight: 'bold',
  },
  headingEn: {
    fontSize: isTablet ? RFValue(16) : RFValue(12),
    lineHeight: isTablet ? RFValue(16) : RFValue(12),
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  bottom: { flex: 1.5 },
  linesContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    height: barHeight,
    top: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  barTerminal: {
    width: barTerminalWidth,
    height: barHeight,
    bottom: -barHeight,
    position: 'absolute',
  },
  joBar: {
    position: 'absolute',
    height: 32,
  },
  centerCircle: {
    position: 'absolute',
    width: isTablet ? 50 : 24,
    height: isTablet ? 50 : 24,
    backgroundColor: 'white',
    alignSelf: 'center',
    top: isTablet ? 0 : 4,
    borderRadius: isTablet ? 25 : 15,
    zIndex: 9999,
  },
  trainTypeLeftContainer: {
    position: 'absolute',
    top: 0,
    borderLeftWidth: isTablet ? 32 : 20,
    borderRightWidth: isTablet ? 32 : 20,
    borderBottomWidth: isTablet ? 32 : 20,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '90deg' }],
    borderWidth: 0,
  },
  trainTypeLeft: {
    width: 128,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: isTablet ? 0 : -8,
    left: edgeOffset * 2,
  },
  trainTypeRight: {
    width: 128,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: isTablet ? 0 : -8,
    right: edgeOffset * 2 + barTerminalWidth / 2,
  },
  trainTypeBoxGradient: {
    width: isTablet ? 200 : 128,
    height: isTablet ? 80 : 48,
    position: 'absolute',
    borderRadius: 4,
  },
  textWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    shadowOpacity: 0.25,
    shadowColor: '#333',
    shadowRadius: 1,
    elevation: 5,
    fontSize: RFValue(18),
    lineHeight: RFValue(18),
  },
  textEn: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    shadowOpacity: 0.25,
    shadowColor: '#333',
    shadowRadius: 1,
    elevation: 5,
    fontSize: RFValue(12),
    includeFontPadding: false,
  },
  lineText: {
    width: isTablet ? 200 : 128,
    textAlign: 'center',
    fontWeight: 'bold',
    position: 'absolute',
    top: isTablet ? 70 : 50,
    fontSize: RFValue(12),
    lineHeight: RFValue(12),
  },
});

const useBarWidth = () => {
  const dim = useWindowDimensions();
  return Math.max(0, dim.width / 2 - edgeOffset);
};

const MetroBars = ({
  currentLine,
  nextLine,
  trainType,
  nextTrainType,
}: {
  currentLine: Line;
  nextLine: Line;
  trainType: TrainType;
  nextTrainType: TrainType;
}) => {
  const dim = useWindowDimensions();
  const barWidth = useBarWidth();
  const rightBarWidth = Math.max(0, barWidth - barTerminalWidth);

  if (!trainType || !nextTrainType) {
    return null;
  }

  return (
    <View style={[styles.linesContainer, { width: dim.width }]}>
      {/* Current line */}
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={[
          styles.bar,
          {
            left: edgeOffset,
            width: barWidth,
          },
        ]}
      />
      <LinearGradient
        colors={['#aaaaaaff', '#aaaaaabb']}
        style={[
          styles.bar,
          {
            left: edgeOffset,
            width: barWidth,
          },
        ]}
      />
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={[
          styles.bar,
          {
            left: edgeOffset,
            width: barWidth,
          },
        ]}
      />
      <LinearGradient
        colors={[
          `${(nextLine ? currentLine : trainType)?.color ?? '#000000'}ff`,
          `${(nextLine ? currentLine : trainType)?.color ?? '#000000'}bb`,
        ]}
        style={[
          styles.bar,
          {
            left: edgeOffset,
            width: barWidth,
          },
        ]}
      />

      <View style={styles.centerCircle} />

      {/* Next line */}
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={[
          styles.bar,
          {
            right: edgeOffset + barTerminalWidth,
            width: rightBarWidth,
          },
        ]}
      />
      <LinearGradient
        colors={['#aaaaaaff', '#aaaaaabb']}
        style={[
          styles.bar,
          {
            right: edgeOffset + barTerminalWidth,
            width: rightBarWidth,
          },
        ]}
      />
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={[
          styles.bar,
          {
            right: edgeOffset + barTerminalWidth,
            width: rightBarWidth,
          },
        ]}
      />
      <LinearGradient
        colors={[
          `${(nextLine ?? nextTrainType)?.color ?? '#000000'}ff`,
          `${(nextLine ?? nextTrainType)?.color ?? '#000000'}bb`,
        ]}
        style={[
          styles.bar,
          {
            right: edgeOffset + barTerminalWidth,
            width: rightBarWidth,
          },
        ]}
      />
      <BarTerminalEast
        width={barTerminalWidth}
        height={barHeight}
        style={[
          styles.barTerminal,
          {
            left: edgeOffset + barWidth + rightBarWidth,
          },
        ]}
        lineColor={(nextLine ?? nextTrainType)?.color ?? '#000000'}
        hasTerminus={false}
      />

      <View style={styles.trainTypeLeft}>
        <LinearGradient
          colors={['#aaa', '#000', '#000', '#aaa']}
          locations={[0.5, 0.5, 0.5, 0.9]}
          style={styles.trainTypeBoxGradient}
        />
        <LinearGradient
          colors={[`${trainType.color}ee`, `${trainType.color}aa`]}
          style={styles.trainTypeBoxGradient}
        />

        <View style={styles.textWrapper}>
          <Typography
            style={styles.text}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {(trainType.name ?? '')
              .replace('\n', '')
              .replace(parenthesisRegexp, '')}
          </Typography>
          <Typography
            adjustsFontSizeToFit
            style={styles.textEn}
            numberOfLines={1}
          >
            {truncateTrainType(
              (trainType.nameRoman ?? '')
                .replace('\n', '')
                .replace(parenthesisRegexp, '')
            )}
          </Typography>
        </View>
        {nextLine && (
          <Typography
            style={[
              styles.lineText,
              {
                color: currentLine?.color ?? '#000000',
              },
            ]}
          >
            {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
            {(currentLine?.nameShort ?? '').replace(parenthesisRegexp, '')}{' '}
            {(currentLine?.nameRoman ?? '').replace(parenthesisRegexp, '')}
          </Typography>
        )}
      </View>
      <View style={styles.trainTypeRight}>
        <LinearGradient
          colors={['#aaa', '#000', '#000', '#aaa']}
          locations={[0.5, 0.5, 0.5, 0.9]}
          style={styles.trainTypeBoxGradient}
        />
        <LinearGradient
          colors={[`${nextTrainType.color}ee`, `${nextTrainType.color}aa`]}
          style={styles.trainTypeBoxGradient}
        />

        <View style={styles.textWrapper}>
          <Typography
            style={styles.text}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {(nextTrainType.name ?? '')
              .replace('\n', '')
              .replace(parenthesisRegexp, '')}
          </Typography>
          <Typography
            adjustsFontSizeToFit
            style={styles.textEn}
            numberOfLines={1}
          >
            {truncateTrainType(
              (nextTrainType.nameRoman ?? '')
                .replace('\n', '')
                .replace(parenthesisRegexp, '')
            )}
          </Typography>
        </View>
        {nextLine && (
          <Typography
            style={[
              styles.lineText,
              {
                color: nextLine.color ?? '#000000',
              },
            ]}
          >
            {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
            {(nextLine.nameShort ?? '').replace(parenthesisRegexp, '')}{' '}
            {(nextLine.nameRoman ?? '').replace(parenthesisRegexp, '')}
          </Typography>
        )}
      </View>
    </View>
  );
};

const SaikyoBars = ({
  currentLine,
  nextLine,
  trainType,
  nextTrainType,
}: {
  currentLine: Line;
  nextLine: Line;
  trainType: TrainType;
  nextTrainType: TrainType;
}) => {
  const dim = useWindowDimensions();
  const barWidth = useBarWidth();
  const rightBarWidth = Math.max(0, barWidth - barTerminalWidth);

  return (
    <View style={[styles.linesContainer, { width: dim.width }]}>
      {/* Current line */}
      <LinearGradient
        colors={['#fff', '#000', '#000']}
        locations={[0.1, 0.5, 0.9]}
        style={[
          styles.bar,
          {
            left: edgeOffset,
            width: barWidth,
          },
        ]}
      />
      <LinearGradient
        colors={['#aaaaaaff', '#aaaaaabb']}
        style={[
          styles.bar,
          {
            left: edgeOffset,
            width: barWidth,
          },
        ]}
      />
      <LinearGradient
        colors={['#fff', '#000', '#000']}
        locations={[0.1, 0.5, 0.9]}
        style={[
          styles.bar,
          {
            left: edgeOffset,
            width: barWidth,
          },
        ]}
      />
      <LinearGradient
        colors={[
          `${(nextLine ? currentLine : trainType)?.color ?? '#000000'}ff`,
          `${(nextLine ? currentLine : trainType)?.color ?? '#000000'}bb`,
        ]}
        style={[
          styles.bar,
          {
            left: edgeOffset,
            width: barWidth,
          },
        ]}
      />
      <View style={styles.centerCircle} />
      {/* Next line */}
      <LinearGradient
        colors={['#fff', '#000', '#000']}
        locations={[0.1, 0.5, 0.9]}
        style={[
          styles.bar,
          {
            right: edgeOffset + barTerminalWidth,
            width: rightBarWidth,
          },
        ]}
      />
      <LinearGradient
        colors={['#aaaaaaff', '#aaaaaabb']}
        style={[
          styles.bar,
          {
            right: edgeOffset + barTerminalWidth,
            width: rightBarWidth,
          },
        ]}
      />
      <LinearGradient
        colors={['#fff', '#000', '#000']}
        locations={[0.1, 0.5, 0.9]}
        style={[
          styles.bar,
          {
            right: edgeOffset + barTerminalWidth,
            width: rightBarWidth,
          },
        ]}
      />
      <LinearGradient
        colors={[
          `${(nextLine ?? nextTrainType)?.color || '#000000'}ff`,
          `${(nextLine ?? nextTrainType)?.color || '#000000'}bb`,
        ]}
        style={[
          styles.bar,
          {
            right: edgeOffset + barTerminalWidth,
            width: rightBarWidth,
          },
        ]}
      />
      <BarTerminalSaikyo
        width={barTerminalWidth}
        height={barHeight}
        style={[
          styles.barTerminal,
          {
            left: edgeOffset + barWidth + rightBarWidth,
          },
        ]}
        lineColor={(nextLine ?? nextTrainType)?.color ?? '#000000'}
        hasTerminus={false}
      />

      <View style={styles.trainTypeLeft}>
        <LinearGradient
          colors={['#fff', '#000', '#000']}
          locations={[0.1, 0.5, 0.9]}
          style={styles.trainTypeBoxGradient}
        />
        <LinearGradient
          colors={[`${trainType.color}ee`, `${trainType.color}aa`]}
          style={styles.trainTypeBoxGradient}
        />

        <View style={styles.textWrapper}>
          <Typography
            adjustsFontSizeToFit
            numberOfLines={1}
            style={styles.text}
          >
            {(trainType.name ?? '')
              .replace('\n', '')
              .replace(parenthesisRegexp, '')}
          </Typography>
          <Typography
            adjustsFontSizeToFit
            style={styles.textEn}
            numberOfLines={1}
          >
            {truncateTrainType(
              (trainType.nameRoman ?? '')
                .replace('\n', '')
                .replace(parenthesisRegexp, '')
            )}
          </Typography>
        </View>

        <Typography
          style={[
            styles.lineText,
            {
              color: currentLine?.color ?? '#000000',
            },
          ]}
        >
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {(currentLine?.nameShort ?? '').replace(parenthesisRegexp, '')}{' '}
          {(currentLine?.nameRoman ?? '').replace(parenthesisRegexp, '')}
        </Typography>
      </View>
      <View style={styles.trainTypeRight}>
        <LinearGradient
          colors={['#fff', '#000', '#000']}
          locations={[0.1, 0.5, 0.9]}
          style={styles.trainTypeBoxGradient}
        />
        <LinearGradient
          colors={[
            `${(nextTrainType ?? trainType).color}ee`,
            `${(nextTrainType ?? trainType).color}aa`,
          ]}
          style={styles.trainTypeBoxGradient}
        />

        <View style={styles.textWrapper}>
          <Typography
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.text}
          >
            {((nextTrainType ?? trainType)?.name ?? '')
              .replace('\n', '')
              .replace(parenthesisRegexp, '')}
          </Typography>
          <Typography
            adjustsFontSizeToFit
            style={styles.textEn}
            numberOfLines={1}
          >
            {truncateTrainType(
              ((nextTrainType ?? trainType)?.nameRoman ?? '')
                .replace('\n', '')
                .replace(parenthesisRegexp, '')
            )}
          </Typography>
        </View>

        <Typography
          style={[
            styles.lineText,
            {
              color: nextLine.color ?? '#000000',
            },
          ]}
        >
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {(nextLine.nameShort ?? '').replace(parenthesisRegexp, '')}{' '}
          {(nextLine.nameRoman ?? '').replace(parenthesisRegexp, '')}
        </Typography>
      </View>
    </View>
  );
};

const JOBars = ({
  currentLine,
  nextLine,
  trainType,
  nextTrainType,
}: {
  currentLine: Line;
  nextLine: Line;
  trainType: TrainType;
  nextTrainType: TrainType;
}) => {
  const dim = useWindowDimensions();
  const barWidth = useBarWidth();
  const rightBarWidth = Math.max(0, barWidth - barTerminalWidth);

  return (
    <View style={[styles.linesContainer, { width: dim.width }]}>
      {/* Current line */}
      <View
        style={[
          styles.bar,
          {
            left: edgeOffset,
            width: barWidth,
            backgroundColor:
              (nextLine ? currentLine : trainType)?.color ?? 'transparent',
          },
        ]}
      />
      <View style={styles.centerCircle} />
      {/* Next line */}
      <View
        style={[
          styles.bar,
          {
            right: edgeOffset + barTerminalWidth,
            width: rightBarWidth,
            backgroundColor:
              (nextLine ?? nextTrainType)?.color ?? 'transparent',
          },
        ]}
      />

      <View
        style={[
          styles.trainTypeLeftContainer,
          {
            right: isTablet ? edgeOffset + 16 : edgeOffset + 10,

            borderBottomColor:
              (nextLine ?? nextTrainType)?.color ?? 'transparent',
          },
        ]}
      />

      <View
        style={[
          styles.trainTypeLeft,
          {
            backgroundColor: trainType.color ?? '#000000',
            width: isTablet ? 200 : 128,
            height: isTablet ? 80 : 48,
            borderRadius: 4,
          },
        ]}
      >
        <View style={styles.textWrapper}>
          <Typography
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[styles.text, { shadowOpacity: 0 }]}
          >
            {(trainType.name ?? '')
              .replace('\n', '')
              .replace(parenthesisRegexp, '')}
          </Typography>
          <Typography
            adjustsFontSizeToFit
            style={[styles.textEn, { shadowOpacity: 0 }]}
            numberOfLines={1}
          >
            {truncateTrainType(
              (trainType.nameRoman ?? '')
                .replace('\n', '')
                .replace(parenthesisRegexp, '')
            )}
          </Typography>
        </View>

        <Typography
          style={[
            styles.lineText,
            {
              color: currentLine?.color ?? '#000000',
              top: isTablet ? 90 : 55,
            },
          ]}
        >
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {(currentLine?.nameShort ?? '').replace(parenthesisRegexp, '')}{' '}
          {(currentLine?.nameRoman ?? '').replace(parenthesisRegexp, '')}
        </Typography>
      </View>

      <View
        style={[
          styles.trainTypeRight,
          {
            backgroundColor: nextTrainType.color ?? '#000000',
            width: isTablet ? 200 : 128,
            height: isTablet ? 80 : 48,
            borderRadius: 4,
          },
        ]}
      >
        <View style={styles.textWrapper}>
          <Typography
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.text, { shadowOpacity: 0 }]}
          >
            {(nextTrainType.name ?? '')
              .replace('\n', '')
              .replace(parenthesisRegexp, '')}
          </Typography>
          <Typography
            adjustsFontSizeToFit
            style={[styles.textEn, { shadowOpacity: 0 }]}
            numberOfLines={1}
          >
            {truncateTrainType(
              (nextTrainType.nameRoman ?? '')
                .replace('\n', '')
                .replace(parenthesisRegexp, '')
            )}
          </Typography>
        </View>

        <Typography
          style={[
            styles.lineText,
            {
              color: nextLine?.color ?? '#000000',
              top: isTablet ? 90 : 55,
            },
          ]}
        >
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {(nextLine.nameShort ?? '').replace(parenthesisRegexp, '')}{' '}
          {(nextLine.nameRoman ?? '').replace(parenthesisRegexp, '')}
        </Typography>
      </View>
    </View>
  );
};

const HeadingJa = React.memo(
  ({
    headingTexts,
  }: {
    headingTexts: {
      jaPrefix: string;
      enPrefix: string;
      jaSuffix?: string;
      enSuffix?: string;
    } | null;
  }) => {
    const trainType = useCurrentTrainType();
    const nextTrainType = useNextTrainType();

    if (!headingTexts) {
      return null;
    }

    if (headingTexts.jaSuffix) {
      return (
        <Typography numberOfLines={2} style={styles.headingJa}>
          {`${headingTexts.jaPrefix} `}
          <Typography
            style={[
              { color: (nextTrainType ?? trainType)?.color ?? '#212121' },
              styles.trainTypeText,
            ]}
          >
            {((nextTrainType ?? trainType)?.name ?? '')
              .replace('\n', '')
              .replace(parenthesisRegexp, '')}
          </Typography>
          {` ${headingTexts.jaSuffix}`}
        </Typography>
      );
    }
    return (
      <Typography style={styles.headingJa}>{headingTexts.jaPrefix}</Typography>
    );
  }
);

const HeadingEn = React.memo(
  ({
    headingTexts,
  }: {
    headingTexts: {
      jaPrefix: string;
      enPrefix: string;
      jaSuffix?: string;
      enSuffix?: string;
    } | null;
  }) => {
    const trainType = useCurrentTrainType();
    const nextTrainType = useNextTrainType();

    if (!headingTexts) {
      return null;
    }

    if (headingTexts.enSuffix) {
      return (
        <Typography style={styles.headingEn}>
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {headingTexts.enPrefix}{' '}
          <Typography
            style={[
              { color: (nextTrainType ?? trainType)?.color ?? '#212121' },
              styles.trainTypeText,
            ]}
          >
            {((nextTrainType ?? trainType)?.nameRoman ?? '')
              .replace('\n', '')
              .replace(parenthesisRegexp, '')}
          </Typography>
          {` ${headingTexts.enSuffix}`}
        </Typography>
      );
    }

    return (
      <Typography style={styles.headingEn}>{headingTexts.enPrefix}</Typography>
    );
  }
);

const TypeChangeNotify: React.FC = () => {
  const { selectedDirection, stations, selectedBound } =
    useAtomValue(stationState);
  const theme = useThemeStore();
  const station = useCurrentStation();
  const currentLine = useCurrentLine();
  const trainType = useCurrentTrainType();
  const nextTrainType = useNextTrainType();

  const nextLine = useMemo(() => nextTrainType?.line, [nextTrainType]);

  const reversedStations = useMemo(
    () => stations.slice().reverse(),
    [stations]
  );
  const reversedFinalPassedStationIndex = useMemo(
    () =>
      reversedStations.findIndex((s) => s.stopCondition === StopCondition.Not),
    [reversedStations]
  );
  const reversedCurrentStationIndex = useMemo(
    () => reversedStations.findIndex((s) => s.groupId === station?.groupId),
    [reversedStations, station]
  );
  const afterAllStopLastStation = useMemo(
    () => reversedStations[reversedFinalPassedStationIndex - 2],
    [reversedStations, reversedFinalPassedStationIndex]
  );
  // 「~から先は各駅に止まります」を表示するフラグ
  const isNextTypeIsLocal = useMemo(
    () =>
      nextTrainType &&
      // 次の路線の種別が各停・普通
      getIsLocal(nextTrainType) &&
      // 現在の種別が各停・普通の場合は表示しない
      !getIsLocal(trainType) &&
      // 最後に各駅に停まる駅の路線が次の路線の種別と同じ
      afterAllStopLastStation?.line?.id ===
        (nextTrainType.line ?? currentLine)?.id &&
      // 次の停車駅パターン変更駅が現在の駅より前の駅ではない
      reversedCurrentStationIndex > reversedFinalPassedStationIndex,
    [
      afterAllStopLastStation,
      currentLine,
      nextTrainType,
      trainType,
      reversedCurrentStationIndex,
      reversedFinalPassedStationIndex,
    ]
  );
  const currentTypeFinalStation = useMemo(() => {
    if (
      isNextTypeIsLocal &&
      // 現在の路線内から各駅に停まる時は表示しない
      currentLine?.id !==
        reversedStations[reversedFinalPassedStationIndex - 2]?.line?.id
    ) {
      return afterAllStopLastStation;
    }

    if (selectedDirection === 'INBOUND') {
      const currentTypeStations = stations.filter(
        (s) => s.trainType?.typeId === trainType?.typeId
      );
      return currentTypeStations.at(-1);
    }

    // NOTE: 小田急線 小田原〜新宿の種別が変わる駅が開成駅になってしまうのでOUTBOUNDではnextTrainTypeを使用している
    const nextTypeStations = stations.filter(
      (s) => s.trainType?.typeId === nextTrainType?.typeId
    );
    return nextTypeStations.at(-1);
  }, [
    trainType,
    nextTrainType,
    selectedDirection,
    afterAllStopLastStation,
    currentLine,
    isNextTypeIsLocal,
    reversedFinalPassedStationIndex,
    reversedStations,
    stations,
  ]);

  const aOrAn = useMemo(() => {
    if (!nextTrainType || !trainType) {
      return '';
    }
    const first = (nextTrainType ?? trainType)?.nameRoman?.[0].toLowerCase();
    switch (first) {
      case 'a':
      case 'e':
      case 'i':
      case 'o':
      case 'u':
        return 'an';
      default:
        return 'a';
    }
  }, [nextTrainType, trainType]);

  const headingTexts = useMemo((): {
    jaPrefix: string;
    enPrefix: string;
    jaSuffix?: string;
    enSuffix?: string;
  } | null => {
    if (!currentTypeFinalStation) {
      return null;
    }

    if (
      isNextTypeIsLocal &&
      // 現在の路線内から各駅に停まる時は表示しない
      currentLine?.id !==
        reversedStations[reversedFinalPassedStationIndex - 2]?.line?.id
    ) {
      return {
        jaPrefix: `${afterAllStopLastStation?.name}から先は各駅にとまります`,
        enPrefix: `The train stops at all stations after ${afterAllStopLastStation?.nameRoman}.`,
      };
    }

    if (!selectedBound) {
      return null;
    }

    return {
      jaPrefix: `${currentTypeFinalStation.name}から`,
      enPrefix: `From ${currentTypeFinalStation.nameRoman} station, this train become ${aOrAn}`,
      jaSuffix: `${selectedBound.name}ゆき となります`,
      enSuffix: `train bound for ${selectedBound.nameRoman}.`,
    };
  }, [
    aOrAn,
    afterAllStopLastStation?.name,
    afterAllStopLastStation?.nameRoman,
    currentLine?.id,
    currentTypeFinalStation,
    isNextTypeIsLocal,
    reversedFinalPassedStationIndex,
    reversedStations,
    selectedBound,
  ]);

  const BarsComponent = useCallback(() => {
    if (!currentLine || !nextLine || !trainType || !nextTrainType) {
      return null;
    }

    switch (theme) {
      case 'SAIKYO':
        return (
          <SaikyoBars
            currentLine={currentLine}
            nextLine={nextLine}
            trainType={trainType}
            nextTrainType={nextTrainType}
          />
        );
      case 'YAMANOTE':
      case 'JO':
      case 'JL':
        return (
          <JOBars
            currentLine={currentLine}
            nextLine={nextLine}
            trainType={trainType}
            nextTrainType={nextTrainType}
          />
        );
      default:
        return (
          <MetroBars
            currentLine={currentLine}
            nextLine={nextLine}
            trainType={trainType}
            nextTrainType={nextTrainType}
          />
        );
    }
  }, [currentLine, nextLine, trainType, nextTrainType, theme]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        <HeadingJa headingTexts={headingTexts} />
        <HeadingEn headingTexts={headingTexts} />
      </View>
      <View style={styles.bottom}>
        <Typography style={styles.headingJa}>
          {currentTypeFinalStation?.name}
        </Typography>
        <Typography style={styles.headingEn}>
          {currentTypeFinalStation?.nameRoman}
        </Typography>
        <BarsComponent />
      </View>
    </SafeAreaView>
  );
};

export default React.memo(TypeChangeNotify);

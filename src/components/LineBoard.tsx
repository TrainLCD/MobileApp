import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecoilValue } from 'recoil';
import useCurrentStation from '../hooks/useCurrentStation';
import usePreviousStation from '../hooks/usePreviousStation';
import { STOP_CONDITION } from '../models/StationAPI';
import { APP_THEME } from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import { isJapanese, translate } from '../translation';
import isTablet from '../utils/isTablet';
import LineBoardEast from './LineBoardEast';
import LineBoardSaikyo from './LineBoardSaikyo';
import LineBoardWest from './LineBoardWest';
import LineBoardYamanotePad from './LineBoardYamanotePad';

export interface Props {
  hasTerminus: boolean;
}

const styles = StyleSheet.create({
  bottomNotice: {
    position: 'absolute',
    bottom: isTablet ? 96 : 12,
    fontWeight: 'bold',
    color: '#3a3a3a',
    fontSize: RFValue(12),
  },
});

const LineBoard: React.FC<Props> = ({ hasTerminus }: Props) => {
  const { theme } = useRecoilValue(themeState);
  const { leftStations } = useRecoilValue(navigationState);
  const { arrived } = useRecoilValue(stationState);
  const currentStation = useCurrentStation({ skipPassStation: true });

  const slicedLeftStations = useMemo(
    () => leftStations.slice(0, 8),
    [leftStations]
  );
  const currentStationIndex = useMemo(
    () =>
      slicedLeftStations.findIndex((s) => {
        return s.groupId === currentStation?.groupId;
      }),
    [slicedLeftStations, currentStation?.groupId]
  );
  const slicedLeftStationsForYamanote = useMemo(
    () => slicedLeftStations.slice(currentStationIndex, 8),
    [currentStationIndex, slicedLeftStations]
  );

  const passStations = useMemo(
    () =>
      slicedLeftStations.filter(
        (s) =>
          s.stopCondition === STOP_CONDITION.PARTIAL ||
          s.stopCondition === STOP_CONDITION.PARTIAL_STOP
      ),
    [slicedLeftStations]
  );

  const prevStop = usePreviousStation();

  const stationsForJRWest = useMemo(() => {
    if (theme !== APP_THEME.JR_WEST) {
      return [];
    }

    const includesPrevStop = slicedLeftStations.some(
      (s) => s.groupId === prevStop?.groupId
    );

    if (arrived || !prevStop || includesPrevStop || currentStationIndex > 0) {
      return slicedLeftStations;
    }

    const paddedStations = [
      prevStop,
      ...slicedLeftStations.slice(0, slicedLeftStations.length - 1),
    ];

    return paddedStations;
  }, [arrived, currentStationIndex, prevStop, slicedLeftStations, theme]);

  const lineColors = useMemo(
    () =>
      (theme === APP_THEME.JR_WEST
        ? stationsForJRWest
        : slicedLeftStations
      ).map((s) => s.currentLine?.lineColorC),
    [slicedLeftStations, stationsForJRWest, theme]
  );

  // [重要] 依存変数をすべてメモ化しないと山手線iPadテーマのアニメーションが何度も走る
  const Inner = useCallback(() => {
    switch (theme) {
      case APP_THEME.JR_WEST:
        return (
          <LineBoardWest lineColors={lineColors} stations={stationsForJRWest} />
        );
      case APP_THEME.SAIKYO:
        return (
          <LineBoardSaikyo
            stations={slicedLeftStations}
            hasTerminus={hasTerminus}
            lineColors={lineColors}
          />
        );
      case APP_THEME.YAMANOTE:
        if (isTablet) {
          return (
            <LineBoardYamanotePad stations={slicedLeftStationsForYamanote} />
          );
        }
        return (
          <LineBoardEast
            stations={slicedLeftStations}
            hasTerminus={hasTerminus}
            lineColors={lineColors}
            withExtraLanguage={false}
          />
        );
      default:
        return (
          <LineBoardEast
            stations={slicedLeftStations}
            hasTerminus={hasTerminus}
            lineColors={lineColors}
            withExtraLanguage={theme === APP_THEME.TOEI}
          />
        );
    }
  }, [
    hasTerminus,
    lineColors,
    slicedLeftStations,
    slicedLeftStationsForYamanote,
    stationsForJRWest,
    theme,
  ]);

  const { left: safeAreaLeft } = useSafeAreaInsets();

  return (
    <>
      <Inner />
      {passStations.length ? (
        <Text style={[styles.bottomNotice, { left: safeAreaLeft || 16 }]}>
          {translate('partiallyPassBottomNoticePrefix')}
          {isJapanese
            ? passStations.map((s) => s.name).join('、')
            : ` ${passStations.map((s) => s.nameR).join(', ')}`}
          {translate('partiallyPassBottomNoticeSuffix')}
        </Text>
      ) : null}
    </>
  );
};

export default React.memo(LineBoard);

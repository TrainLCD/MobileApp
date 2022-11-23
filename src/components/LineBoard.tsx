import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecoilValue } from 'recoil';
import useCurrentLine from '../hooks/useCurrentLine';
import { StopCondition } from '../models/StationAPI';
import AppTheme from '../models/Theme';
import lineState from '../store/atoms/line';
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
  const currentLine = useCurrentLine();
  const { theme } = useRecoilValue(themeState);
  const { station } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { leftStations } = useRecoilValue(navigationState);
  const slicedLeftStations = useMemo(
    () => leftStations.slice(0, 8),
    [leftStations]
  );
  const currentStationIndex = useMemo(
    () => slicedLeftStations.findIndex((s) => s.groupId === station?.groupId),
    [slicedLeftStations, station?.groupId]
  );
  const slicedLeftStationsForYamanote = useMemo(
    () => slicedLeftStations.slice(currentStationIndex, 8),
    [currentStationIndex, slicedLeftStations]
  );

  const belongingLines = useMemo(
    () => leftStations.map((ls) => ls.currentLine),
    [leftStations]
  );

  const lineColors = useMemo(
    () => slicedLeftStations.map((s) => s.currentLine?.lineColorC),
    [slicedLeftStations]
  );

  const passStations = useMemo(
    () =>
      slicedLeftStations.filter(
        (s) =>
          s.stopCondition === StopCondition.PARTIAL ||
          s.stopCondition === StopCondition.PARTIAL_STOP
      ),
    [slicedLeftStations]
  );

  // [重要] 依存変数をすべてメモ化しないと山手線iPadテーマのアニメーションが何度も走る
  const Inner = useCallback(() => {
    if (!selectedLine) {
      return null;
    }
    switch (theme) {
      case AppTheme.JRWest:
        return (
          <LineBoardWest
            lineColors={lineColors}
            stations={slicedLeftStations}
            line={currentLine || selectedLine}
            lines={belongingLines}
          />
        );
      // TODO: 加工していないprops渡しを消して子コンポーネントでstateを取るようにする
      case AppTheme.Saikyo:
        return (
          <LineBoardSaikyo
            stations={slicedLeftStations}
            line={currentLine || selectedLine}
            lines={belongingLines}
            hasTerminus={hasTerminus}
            lineColors={lineColors}
          />
        );
      case AppTheme.Yamanote:
        if (isTablet) {
          return (
            <LineBoardYamanotePad
              stations={slicedLeftStationsForYamanote}
              line={currentLine || selectedLine}
            />
          );
        }
        return (
          <LineBoardEast
            stations={slicedLeftStations}
            line={currentLine || selectedLine}
            hasTerminus={hasTerminus}
            lines={belongingLines}
            lineColors={lineColors}
            withExtraLanguage={false}
          />
        );
      default:
        return (
          <LineBoardEast
            stations={slicedLeftStations}
            line={currentLine || selectedLine}
            hasTerminus={hasTerminus}
            lines={belongingLines}
            lineColors={lineColors}
            withExtraLanguage={theme === AppTheme.Toei}
          />
        );
    }
  }, [
    belongingLines,
    currentLine,
    hasTerminus,
    lineColors,
    selectedLine,
    slicedLeftStations,
    slicedLeftStationsForYamanote,
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

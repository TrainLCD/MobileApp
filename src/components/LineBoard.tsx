import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecoilValue } from 'recoil';
import { StopCondition } from '../models/StationAPI';
import AppTheme from '../models/Theme';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import { isJapanese, translate } from '../translation';
import isTablet from '../utils/isTablet';
import LineBoardEast from './LineBoardEast';
import LineBoardLightweight from './LineBoardLightWeight';
import LineBoardSaikyo from './LineBoardSaikyo';
import LineBoardWest from './LineBoardWest';
<<<<<<< HEAD
=======
import LineBoardYamanotePad from './LineBoardYamanotePad';
>>>>>>> parent of d6a06582 (JRW、JYテーマのコード削除)

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
<<<<<<< HEAD
  const { arrived } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { leftStations } = useRecoilValue(navigationState);
  const slicedLeftStations = leftStations.slice(0, 8);
=======
  const { arrived, station, rawStations, selectedDirection } =
    useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { leftStations } = useRecoilValue(navigationState);
  const slicedLeftStations = leftStations.slice(0, 8);
  const currentStationIndex = slicedLeftStations.findIndex(
    (s) => s.groupId === station?.groupId
  );
  const slicedLeftStationsForYamanote = slicedLeftStations.slice(
    currentStationIndex,
    8
  );
>>>>>>> parent of d6a06582 (JRW、JYテーマのコード削除)

  const belongingLines = leftStations.map((ls) => ls.currentLine);

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

  const Inner = useCallback(() => {
    switch (theme) {
      case AppTheme.JRWest:
        return (
          <LineBoardWest
            lineColors={lineColors}
            stations={slicedLeftStations}
            line={belongingLines[0] || selectedLine}
            lines={belongingLines}
          />
        );
      // TODO: 加工していないprops渡しを消して子コンポーネントでstateを取るようにする
      case AppTheme.Saikyo:
        return (
          <LineBoardSaikyo
            arrived={arrived}
            stations={slicedLeftStations}
            line={belongingLines[0] || selectedLine}
            lines={belongingLines}
            hasTerminus={hasTerminus}
            lineColors={lineColors}
          />
        );
<<<<<<< HEAD
      case AppTheme.Lightweight:
        return (
          <LineBoardLightweight
            arrived={arrived}
            stations={slicedLeftStations}
            line={belongingLines[0] || selectedLine}
=======
      case AppTheme.Yamanote:
        if (isTablet) {
          return (
            <LineBoardYamanotePad
              arrived={arrived}
              stations={slicedLeftStationsForYamanote}
              line={belongingLines[0] || selectedLine}
            />
          );
        }
        return (
          <LineBoardEast
            arrived={arrived}
            stations={slicedLeftStations}
            line={belongingLines[0] || selectedLine}
            hasTerminus={hasTerminus}
>>>>>>> parent of d6a06582 (JRW、JYテーマのコード削除)
            lines={belongingLines}
            lineColors={lineColors}
          />
        );
<<<<<<< HEAD
=======

>>>>>>> parent of d6a06582 (JRW、JYテーマのコード削除)
      default:
        return (
          <LineBoardEast
            arrived={arrived}
            stations={slicedLeftStations}
            line={belongingLines[0] || selectedLine}
            hasTerminus={hasTerminus}
            lines={belongingLines}
            lineColors={lineColors}
<<<<<<< HEAD
            withExtraLanguage={theme === AppTheme.Toei}
=======
>>>>>>> parent of d6a06582 (JRW、JYテーマのコード削除)
          />
        );
    }
  }, [
    arrived,
    belongingLines,
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

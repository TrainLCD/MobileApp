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
import LineBoardSaikyo from './LineBoardSaikyo';

export interface Props {
  hasTerminus: boolean;
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
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
  const { arrived, rawStations, selectedDirection } =
    useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { leftStations } = useRecoilValue(navigationState);
  const slicedLeftStations = leftStations.slice(0, 8);
  const belongingLines = leftStations.map((ls) => ls.currentLine);

  const lineColors = useMemo(
    () =>
      // 直通した時点で直通先のラインカラーを使う
      // この処理がないと亀有から唐木田方面を見た時綾瀬がまだ常磐線になってしまう
      slicedLeftStations.map((s) => {
        const actualCurrentStation = (
          selectedDirection === 'INBOUND'
            ? rawStations.slice().reverse()
            : rawStations
        ).find((rs) => rs.groupId === s.groupId);
        return actualCurrentStation?.currentLine?.lineColorC;
      }),
    [rawStations, selectedDirection, slicedLeftStations]
  );

  const passStations = useMemo(
    () =>
      slicedLeftStations.filter(
        (s) => s.stopCondition === StopCondition.PARTIAL
      ),
    [slicedLeftStations]
  );

  const Inner = useCallback(() => {
    if (theme === AppTheme.Saikyo) {
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
    }
    return (
      <LineBoardEast
        arrived={arrived}
        stations={slicedLeftStations}
        line={belongingLines[0] || selectedLine}
        hasTerminus={hasTerminus}
        lines={belongingLines}
        lineColors={lineColors}
      />
    );
  }, [
    arrived,
    belongingLines,
    hasTerminus,
    lineColors,
    selectedLine,
    slicedLeftStations,
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

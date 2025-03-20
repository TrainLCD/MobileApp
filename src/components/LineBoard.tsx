import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecoilValue } from 'recoil';
import { StopCondition } from '../../gen/proto/stationapi_pb';
import { useCurrentStation } from '../hooks/useCurrentStation';
import { useThemeStore } from '../hooks/useThemeStore';
import { APP_THEME } from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import { isJapanese, translate } from '../translation';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import LineBoardEast from './LineBoardEast';
import LineBoardJO from './LineBoardJO';
import LineBoardLED from './LineBoardLED';
import LineBoardSaikyo from './LineBoardSaikyo';
import LineBoardToei from './LineBoardToei';
import LineBoardWest from './LineBoardWest';
import LineBoardYamanotePad from './LineBoardYamanotePad';
import Typography from './Typography';
import LineBoardJL from './LineBoardJL';

export interface Props {
  hasTerminus?: boolean;
}

const styles = StyleSheet.create({
  bottomNotice: {
    position: 'absolute',
    bottom: isTablet ? 96 : 12,
    fontWeight: 'bold',
    fontSize: RFValue(12),
  },
});

const LineBoard: React.FC<Props> = ({ hasTerminus = false }: Props) => {
  const theme = useThemeStore((state) => state);
  const { leftStations } = useRecoilValue(navigationState);
  const station = useCurrentStation();
  const isLEDTheme = theme === APP_THEME.LED;

  const slicedLeftStations = useMemo(
    () => leftStations.slice(0, 8),
    [leftStations]
  );

  const currentStationIndex = useMemo(
    () =>
      slicedLeftStations.findIndex((s) => {
        return s.groupId === station?.groupId;
      }),
    [slicedLeftStations, station?.groupId]
  );
  const slicedLeftStationsForYamanote = useMemo(
    () => slicedLeftStations.slice(currentStationIndex, 8),
    [currentStationIndex, slicedLeftStations]
  );

  const passStations = useMemo(
    () =>
      slicedLeftStations.filter(
        (s) =>
          s.stopCondition === StopCondition.Partial ||
          s.stopCondition === StopCondition.PartialStop
      ),
    [slicedLeftStations]
  );

  const lineColors = useMemo(
    () => slicedLeftStations.map((s) => s.line?.color),
    [slicedLeftStations]
  );

  // [重要] 依存変数をすべてメモ化しないと山手線iPadテーマのアニメーションが何度も走る
  const Inner = useCallback(() => {
    switch (theme) {
      case APP_THEME.TOKYO_METRO:
      case APP_THEME.TY:
        return (
          <LineBoardEast
            stations={slicedLeftStations}
            hasTerminus={hasTerminus}
            lineColors={lineColors}
          />
        );
      case APP_THEME.TOEI:
        return (
          <LineBoardToei
            stations={slicedLeftStations}
            hasTerminus={hasTerminus}
            lineColors={lineColors}
          />
        );
      case APP_THEME.JR_WEST:
        return (
          <LineBoardWest
            lineColors={lineColors}
            stations={slicedLeftStations}
          />
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
          <LineBoardJO stations={slicedLeftStations} lineColors={lineColors} />
        );
      case APP_THEME.LED:
        return <LineBoardLED />;
      case APP_THEME.JO:
        return (
          <LineBoardJO stations={slicedLeftStations} lineColors={lineColors} />
        );
      case APP_THEME.JL:
        return (
          <LineBoardJL stations={slicedLeftStations} lineColors={lineColors} />
        );
      default:
        return null;
    }
  }, [
    hasTerminus,
    lineColors,
    slicedLeftStations,
    slicedLeftStationsForYamanote,
    theme,
  ]);

  const { left: safeAreaLeft } = useSafeAreaInsets();

  return (
    <>
      <Inner />
      {passStations.length && !isLEDTheme ? (
        <Typography
          style={[
            styles.bottomNotice,
            {
              color: '#3a3a3a',
              left: safeAreaLeft || 16,
            },
          ]}
        >
          {translate('partiallyPassBottomNotice', {
            stations: isJapanese
              ? passStations.map((s) => s.name).join('、')
              : ` ${passStations.map((s) => s.nameRoman).join(', ')}`,
          })}
        </Typography>
      ) : null}
    </>
  );
};

export default React.memo(LineBoard);

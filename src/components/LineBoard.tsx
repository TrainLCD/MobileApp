import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { parenthesisRegexp } from '~/constants';
import { useDisplayCurrentStation } from '../hooks';
import { APP_THEME } from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import { themeAtom } from '../store/atoms/theme';
import isTablet from '../utils/isTablet';
import { isBusLine } from '../utils/line';
import { RFValue } from '../utils/rfValue';
import LineBoardE231 from './LineBoardE231';
import LineBoardEast from './LineBoardEast';
import LineBoardJO from './LineBoardJO';
import LineBoardJRKyushu from './LineBoardJRKyushu';
import LineBoardLED from './LineBoardLED';
import LineBoardSaikyo from './LineBoardSaikyo';
import LineBoardToei from './LineBoardToei';
import LineBoardWest from './LineBoardWest';
import LineBoardYamanotePad from './LineBoardYamanotePad';

export interface Props {
  hasTerminus?: boolean;
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  bottomNotice: {
    position: 'absolute',
    bottom: isTablet ? 96 : 12,
    fontWeight: 'bold',
    fontSize: RFValue(12),
  },
});

const LineBoard: React.FC<Props> = ({ hasTerminus = false }: Props) => {
  const theme = useAtomValue(themeAtom);
  const { leftStations } = useAtomValue(navigationState);
  // 現在地基準の現在駅(到着取りこぼし時はヘッダーの「まもなく」と一致する側へ自己修復)
  const station = useDisplayCurrentStation();
  const isBus = isBusLine(station?.line);

  const slicedLeftStations = useMemo(() => {
    // 8 件だけ取り出す。bus 路線の場合は親括弧を駅名から除去する加工が必要。
    // 鉄道路線では加工が不要 = 元の配列をそのまま返してオブジェクト生成 / 子コンポーネント
    // の再 memoize を抑える（とくに山手線iPad テーマでアニメーションが何度も走る原因になる）。
    if (!isBus) {
      // sliceは新しい配列を返すが要素は同一参照なので、子コンポーネントは memo 効きやすい。
      return leftStations.length <= 8 ? leftStations : leftStations.slice(0, 8);
    }
    return leftStations.slice(0, 8).map((sta) => ({
      ...sta,
      name: sta.name?.replace(parenthesisRegexp, ''),
      nameRoman: sta.nameRoman?.replace(parenthesisRegexp, ''),
    }));
  }, [leftStations, isBus]);

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
      case APP_THEME.ODAKYU:
        return (
          <LineBoardEast
            stations={slicedLeftStations}
            hasTerminus={hasTerminus}
            lineColors={lineColors}
            isOdakyu
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
      case APP_THEME.E231:
        return (
          <LineBoardE231
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
      case APP_THEME.JL:
        return (
          <LineBoardJO stations={slicedLeftStations} lineColors={lineColors} />
        );
      case APP_THEME.JR_KYUSHU:
        return (
          <LineBoardJRKyushu
            stations={slicedLeftStations}
            lineColors={lineColors}
            hasTerminus={hasTerminus}
          />
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

  return (
    <View style={styles.flexOne}>
      <Inner />
    </View>
  );
};

export default React.memo(LineBoard);

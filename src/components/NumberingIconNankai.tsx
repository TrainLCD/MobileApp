import type React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import {
  FONTS,
  NUMBERING_ICON_SIZE,
  type NumberingIconSize,
} from '../constants';
import isTablet from '../utils/isTablet';
import Typography from './Typography';

const ICON_SIZE = isTablet ? 72 * 1.5 : 72;
// 楕円の白フチ。withOutline のときは同じフチを太らせて代用する
const STROKE_WIDTH = 1;
const OUTLINE_STROKE_WIDTH = isTablet ? 3 : 2;

type Props = {
  stationNumber: string;
  lineColor: string;
  size?: NumberingIconSize;
  withOutline?: boolean;
};

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    width: ICON_SIZE,
    height: ICON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // インセットを指定しない絶対配置だと文字の折り返し幅が楕円の幅として解決されず、
  // 記号が途中で改行されてしまうため SVG と同じ矩形をぴったり覆わせる
  texts: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineSymbol: {
    color: 'white',
    fontSize: isTablet ? 18 * 1.5 : 18,
    lineHeight: isTablet ? 18 * 1.5 : 18,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: isTablet ? 8 : 4,
  },
  rootTiny: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 16.8,
    borderWidth: 1,
    borderColor: 'white',
  },
  lineSymbolTiny: {
    color: 'white',
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.FuturaLTPro,
    marginTop: 2,
  },
  stationNumber: {
    color: 'white',
    fontSize: isTablet ? 32 * 1.5 : 32,
    lineHeight: isTablet ? 32 * 1.5 : 32,
    marginTop: isTablet ? -4 * 1.2 : -4,
    textAlign: 'center',
    fontFamily: FONTS.MyriadPro,
  },
});

const NumberingIconNankai: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  size,
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('-');

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootTiny, { backgroundColor: lineColor }]}>
        <Typography style={styles.lineSymbolTiny}>{lineSymbol}</Typography>
      </View>
    );
  }

  // 白フチは View のボーダーで囲うと真円になり楕円のシンボルと形が合わないため、
  // 楕円自身のストロークを太らせて表現する
  const strokeWidth = withOutline ? OUTLINE_STROKE_WIDTH : STROKE_WIDTH;
  // ストロークはパスの中心から外側にも半分伸びるので、その分だけ半径を詰めないと
  // 楕円の左右端でフチが SVG の描画領域からはみ出して欠ける
  const strokeInset = strokeWidth / 2;

  return (
    <View style={styles.root}>
      <Svg height={ICON_SIZE} width={ICON_SIZE}>
        <Ellipse
          cx={ICON_SIZE / 2}
          cy={ICON_SIZE / 2}
          rx={ICON_SIZE / 2 - strokeInset}
          ry={ICON_SIZE / 2.5 - strokeInset}
          stroke="white"
          strokeWidth={strokeWidth}
          fill={lineColor}
        />
      </Svg>
      <View style={styles.texts}>
        <Typography numberOfLines={1} style={styles.lineSymbol}>
          {lineSymbol}
        </Typography>
        <Typography numberOfLines={1} style={styles.stationNumber}>
          {stationNumber}
        </Typography>
      </View>
    </View>
  );
};

export default NumberingIconNankai;

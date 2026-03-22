import type React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  FONTS,
  NUMBERING_ICON_SIZE,
  type NumberingIconSize,
} from '../constants';
import isTablet from '../utils/isTablet';
import Typography from './Typography';

type Props = {
  stationNumber: string;
  lineColor: string;
  threeLetterCode?: string | null;
  allowScaling: boolean;
  size?: NumberingIconSize;
  transformOrigin?: 'top' | 'center' | 'bottom';
  withOutline?: boolean;
};

const TLC_SCALE = 0.7;

const styles = StyleSheet.create({
  optionalBorder: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  root: {
    width: isTablet ? 72 * 1.5 : 72,
    height: isTablet ? 72 * 1.5 : 72,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 12 : 8,
    borderWidth: isTablet ? 7 * 1.5 : 7,
    backgroundColor: 'white',
  },
  // TLC デフォルト: ヘッダー等の大きなスペース用 (0.7x)
  tlcRoot: {
    justifyContent: 'center',
  },
  tlcContainer: {
    backgroundColor: '#231e1f',
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: isTablet
      ? Math.round(16 * TLC_SCALE)
      : Math.round(14 * TLC_SCALE),
    paddingVertical: isTablet
      ? Math.round(8 * TLC_SCALE)
      : Math.round(4 * TLC_SCALE),
    paddingHorizontal: isTablet
      ? Math.round(8 * TLC_SCALE)
      : Math.round(4 * TLC_SCALE),
  },
  tlcText: {
    color: 'white',
    textAlign: 'center',
    fontSize: isTablet
      ? Math.round(24 * 1.5 * TLC_SCALE)
      : Math.round(24 * TLC_SCALE),
    fontFamily: FONTS.FrutigerNeueLTProBold,
    includeFontPadding: false,
    lineHeight: isTablet
      ? Math.round(24 * 1.5 * TLC_SCALE)
      : Math.round(24 * TLC_SCALE),
  },
  tlcIconRoot: {
    width: isTablet
      ? Math.round(72 * 1.5 * TLC_SCALE)
      : Math.round(72 * TLC_SCALE),
    height: isTablet
      ? Math.round(72 * 1.5 * TLC_SCALE)
      : Math.round(72 * TLC_SCALE),
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet
      ? Math.round(12 * TLC_SCALE)
      : Math.round(8 * TLC_SCALE),
    borderWidth: isTablet
      ? Math.round(7 * 1.5 * TLC_SCALE)
      : Math.round(7 * TLC_SCALE),
    backgroundColor: 'white',
  },
  tlcLineSymbol: {
    lineHeight: isTablet
      ? Math.round(24 * 1.5 * TLC_SCALE)
      : Math.round(24 * TLC_SCALE),
    fontSize: isTablet
      ? Math.round(24 * 1.5 * TLC_SCALE)
      : Math.round(24 * TLC_SCALE),
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: Platform.OS === 'ios' ? Math.round(4 * TLC_SCALE) : 0,
    color: '#231e1f',
  },
  tlcStationNumber: {
    lineHeight: isTablet
      ? Math.round(32 * 1.5 * TLC_SCALE)
      : Math.round(32 * TLC_SCALE),
    fontSize: isTablet
      ? Math.round(32 * 1.5 * TLC_SCALE)
      : Math.round(32 * TLC_SCALE),
    marginTop: Math.round(-4 * TLC_SCALE),
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    color: '#231e1f',
  },
  // TLC LARGE: TransferLineMarkコンテナ(35x35 / 52.5x52.5)に収まるサイズ
  tlcContainerCompact: {
    backgroundColor: '#231e1f',
    borderWidth: 1,
    borderColor: 'white',
    borderRadius: isTablet ? 6 : 4,
    paddingVertical: isTablet ? 2 : 1,
    paddingHorizontal: isTablet ? 2 : 1,
  },
  tlcTextCompact: {
    color: 'white',
    textAlign: 'center',
    fontSize: isTablet ? 12 : 8,
    fontFamily: FONTS.FrutigerNeueLTProBold,
    includeFontPadding: false,
    lineHeight: isTablet ? 12 : 8,
  },
  tlcIconRootCompact: {
    width: isTablet ? 34 : 23,
    height: isTablet ? 34 : 23,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: isTablet ? 4 : 2,
    borderWidth: isTablet ? 3 : 2,
    backgroundColor: 'white',
  },
  tlcLineSymbolCompact: {
    lineHeight: isTablet ? 12 : 8,
    fontSize: isTablet ? 12 : 8,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: Platform.OS === 'ios' ? 1 : 0,
    color: '#231e1f',
  },
  tlcStationNumberCompact: {
    lineHeight: isTablet ? 15 : 10,
    fontSize: isTablet ? 15 : 10,
    marginTop: isTablet ? -2 : -1,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    color: '#231e1f',
  },
  rootSmall: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 4,
    borderWidth: 3,
    borderColor: 'white',
  },
  lineSymbolSmall: {
    fontSize: 10,
    lineHeight: 10,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: 2,
    color: '#231e1f',
  },
  lineSymbol: {
    lineHeight: isTablet ? 24 * 1.5 : 24,
    fontSize: isTablet ? 24 * 1.5 : 24,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: Platform.OS === 'ios' ? 4 : 0,
    color: '#231e1f',
  },
  stationNumber: {
    lineHeight: isTablet ? 32 * 1.5 : 32,
    fontSize: isTablet ? 32 * 1.5 : 32,
    marginTop: -4,
    textAlign: 'center',
    fontFamily: FONTS.FrutigerNeueLTProBold,
    color: '#231e1f',
  },
});

type CommonCompProps = {
  lineColor: string;
  lineSymbol: string;
  stationNumber: string;
  size?: NumberingIconSize;
  withOutline?: boolean;
};

const Common = ({
  lineColor,
  lineSymbol,
  stationNumber,
  size,
  withOutline,
}: CommonCompProps) => {
  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <View style={[styles.rootSmall, { borderColor: lineColor }]}>
        <Typography style={styles.lineSymbolSmall}>{lineSymbol}</Typography>
      </View>
    );
  }
  return (
    <View style={withOutline ? styles.optionalBorder : undefined}>
      <View style={[styles.root, { borderColor: lineColor }]}>
        <Typography style={styles.lineSymbol}>{lineSymbol}</Typography>
        <Typography style={styles.stationNumber}>{stationNumber}</Typography>
      </View>
    </View>
  );
};

const NumberingIconSquare: React.FC<Props> = ({
  stationNumber: stationNumberRaw,
  lineColor,
  threeLetterCode,
  allowScaling,
  size,
  transformOrigin = 'center',
  withOutline,
}: Props) => {
  const [lineSymbol, ...stationNumberRest] = stationNumberRaw.split('-');
  const stationNumber = stationNumberRest.join('');

  if (threeLetterCode) {
    // SMALL: TLCを表示するスペースがないため通常のSMALLアイコンを描画
    if (size === NUMBERING_ICON_SIZE.SMALL) {
      return (
        <Common
          lineColor={lineColor}
          lineSymbol={lineSymbol}
          stationNumber={stationNumber}
          size={size}
          withOutline={withOutline}
        />
      );
    }

    // LARGE/MEDIUM: TransferLineMarkコンテナに収まるコンパクトなTLC描画
    if (
      size === NUMBERING_ICON_SIZE.LARGE ||
      size === NUMBERING_ICON_SIZE.MEDIUM
    ) {
      return (
        <View style={styles.tlcContainerCompact}>
          <Typography style={styles.tlcTextCompact}>
            {threeLetterCode}
          </Typography>
          <View style={[styles.tlcIconRootCompact, { borderColor: lineColor }]}>
            <Typography style={styles.tlcLineSymbolCompact}>
              {lineSymbol}
            </Typography>
            <Typography style={styles.tlcStationNumberCompact}>
              {stationNumber}
            </Typography>
          </View>
        </View>
      );
    }

    // デフォルト: ヘッダー等の大きなスペース用 (0.7xサイズ)
    return (
      <View style={styles.tlcRoot}>
        <View style={styles.tlcContainer}>
          <Typography style={styles.tlcText}>{threeLetterCode}</Typography>
          <View style={[styles.tlcIconRoot, { borderColor: lineColor }]}>
            <Typography style={styles.tlcLineSymbol}>{lineSymbol}</Typography>
            <Typography style={styles.tlcStationNumber}>
              {stationNumber}
            </Typography>
          </View>
        </View>
      </View>
    );
  }

  if (size === NUMBERING_ICON_SIZE.SMALL) {
    return (
      <Common
        lineColor={lineColor}
        lineSymbol={lineSymbol}
        stationNumber={stationNumber}
        size={size}
        withOutline={withOutline}
      />
    );
  }

  return (
    <View
      style={
        allowScaling && {
          transform: [{ scale: 0.8 }],
          transformOrigin,
          paddingVertical: isTablet ? 8 : 4,
          paddingHorizontal: isTablet ? 8 : 4,
        }
      }
    >
      <Common
        lineColor={lineColor}
        lineSymbol={lineSymbol}
        stationNumber={stationNumber}
        withOutline={withOutline}
      />
    </View>
  );
};
export default NumberingIconSquare;

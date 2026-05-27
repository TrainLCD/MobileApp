import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { STATION_NAME_FONT_SIZE } from '../constants';
import {
  useLoopLine,
  useStationNameContainerWidth,
  useStationNameScaleX,
} from '../hooks';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import Clock from './Clock';
import type { HeaderE235Props } from './Header.types';
import NumberingIcon from './NumberingIcon';
import TrainTypeBoxJO from './TrainTypeBoxJO';
import Typography from './Typography';

const styles = StyleSheet.create({
  gradientRoot: {
    paddingLeft: 24,
    overflow: 'hidden',
    height: isTablet ? 200 : 128,
    flexDirection: 'row',
    zIndex: 9999,
  },
  boundContainer: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bound: {
    color: '#fff',
    fontWeight: 'bold',
    width: '100%',
  },
  boundGrayText: {
    color: '#aaa',
    fontWeight: 'bold',
  },
  boundSuffix: {
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  // 駅名 Text は自然な幅でレンダリングさせ、横方向の縮みは transform: scaleX で行う。
  // flex: 1 を Text 自身に持たせると幅が拘束されて先に切り詰められてしまうため、
  // 隣接アイコンの右側の余白を埋める役割は stationNameSlot 側に持たせる。
  stationName: {
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    fontSize: STATION_NAME_FONT_SIZE,
  },
  // 自然描画幅を実測するための非可視 Text。position: 'absolute' で
  // レイアウト計算から切り離し、画面外（top: -9999）へ飛ばすことで親
  // スロットの幅制約を受けずに自然な幅で描画させ、その幅を onTextLayout
  // から取得する。
  stationNameMeasurer: {
    position: 'absolute',
    opacity: 0,
    top: -9999,
    left: 0,
  },
  stationNameSlot: {
    flex: 1,
    // minWidth: 0 を明示しないと flex 子要素の既定 min-width: auto により、
    // 内側 Text の `width: naturalTextWidth` がスロット自身を押し広げてしまい、
    // onLayout が natural と同じ値を返して scaleX = 1（圧縮なし）になる。
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  left: {
    flex: 0.3,
    justifyContent: 'center',
    height: isTablet ? 200 : 128,
    marginRight: 24,
    position: 'relative',
  },
  right: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-end',
    height: isTablet ? 200 : 128,
  },
  state: {
    position: 'absolute',
    top: isTablet ? 24 : 12,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: RFValue(21),
  },
  colorBar: {
    width: isTablet ? 48 : 38,
    height: isTablet ? 190 : 120,
    marginRight: 16,
  },
  clockOverride: {
    position: 'absolute',
    top: 8,
    right: '25%',
  },
  stationNameContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
});

const HeaderE235: React.FC<HeaderE235Props> = (props) => {
  const {
    currentLine,
    selectedBound,
    headerLangState,
    stationText,
    stateText,
    boundText,
    currentStationNumber,
    threeLetterCode,
    numberingColor,
    trainType,
    isJO,
  } = props;

  const { isLoopLine, isPartiallyLoopLine } = useLoopLine();

  const [stationNameSlotWidth, onStationNameSlotLayout] =
    useStationNameContainerWidth();
  const {
    onTextLayout: onStationTextLayout,
    scaleX: stationNameScaleX,
    naturalTextWidth: stationNaturalTextWidth,
  } = useStationNameScaleX(stationText, stationNameSlotWidth);

  const boundPrefix = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return isLoopLine ? 'Bound for' : 'for';
      case 'ZH':
        return '开往';
      default:
        return '';
    }
  }, [headerLangState, isLoopLine]);

  const boundSuffix = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return '';
      case 'ZH':
        return '';
      case 'KO':
        return isLoopLine || isPartiallyLoopLine ? '방면' : '행';
      default:
        return isLoopLine || isPartiallyLoopLine ? '方面' : 'ゆき';
    }
  }, [headerLangState, isLoopLine, isPartiallyLoopLine]);

  const boundContainerMarginTop = useMemo(() => {
    if (!isJO) {
      return 0;
    }
    if (isTablet) {
      return 85;
    }
    return 55;
  }, [isJO]);

  const boundFontSize = useMemo(() => {
    if (isJO) {
      return RFValue(20);
    }
    return RFValue(25);
  }, [isJO]);

  return (
    <LinearGradient colors={['#222222', '#212121']} style={styles.gradientRoot}>
      <View style={styles.left}>
        {isJO ? <TrainTypeBoxJO trainType={trainType} /> : null}

        <View
          style={[
            styles.boundContainer,
            {
              marginTop: boundContainerMarginTop,
            },
          ]}
        >
          {selectedBound && boundPrefix.length ? (
            <Typography
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[
                styles.boundGrayText,
                {
                  fontSize: RFValue(isJO ? 14 : 18),
                },
              ]}
            >
              {boundPrefix}
            </Typography>
          ) : null}
          <Typography
            style={[
              styles.bound,
              {
                fontSize: boundFontSize,
              },
            ]}
            adjustsFontSizeToFit
            numberOfLines={2}
            lineBreakStrategyIOS="push-out"
            textBreakStrategy="balanced"
          >
            {boundText}
          </Typography>
          {selectedBound && boundSuffix.length ? (
            <Typography
              style={[
                styles.boundSuffix,
                {
                  fontSize: RFValue(isJO ? 14 : 18),
                },
                headerLangState === 'KO' ? styles.boundGrayText : null,
              ]}
            >
              {boundSuffix}
            </Typography>
          ) : null}
        </View>
      </View>
      <View
        style={[
          styles.colorBar,
          {
            backgroundColor: currentLine
              ? (currentLine.color ?? '#000')
              : '#aaa',
          },
        ]}
      />
      <View style={styles.right}>
        <Typography style={styles.state} adjustsFontSizeToFit numberOfLines={2}>
          {stateText}
        </Typography>
        <View style={styles.stationNameContainer}>
          {currentStationNumber ? (
            <NumberingIcon
              shape={currentStationNumber.lineSymbolShape || ''}
              lineColor={numberingColor}
              stationNumber={currentStationNumber.stationNumber || ''}
              threeLetterCode={threeLetterCode}
              withDarkTheme
              allowScaling
              transformOrigin="bottom"
            />
          ) : null}
          <View
            style={styles.stationNameSlot}
            onLayout={onStationNameSlotLayout}
          >
            <Typography
              style={[styles.stationName, styles.stationNameMeasurer]}
              numberOfLines={1}
              onTextLayout={onStationTextLayout}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {stationText}
            </Typography>
            <Typography
              style={[
                styles.stationName,
                // 自然幅を明示的に width に渡してスロット幅で ellipsize されないようにする。
                // 視覚的な収まりは scaleX に任せ、ellipsizeMode="clip" で「…」を抑止する。
                stationNaturalTextWidth > 0
                  ? { width: stationNaturalTextWidth }
                  : null,
                { transform: [{ scaleX: stationNameScaleX }] },
              ]}
              numberOfLines={1}
              ellipsizeMode="clip"
            >
              {stationText}
            </Typography>
          </View>
        </View>
      </View>
      <Clock white style={styles.clockOverride} />
    </LinearGradient>
  );
};

export default React.memo(HeaderE235);

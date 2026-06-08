import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { G, Text as SvgText } from 'react-native-svg';
import type { TrainType } from '~/@types/graphql';
import { FONTS, japaneseRegexp, parenthesisRegexp } from '../constants';
import { useCurrentLine } from '../hooks';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import { isLEDThemeAtom } from '../store/atoms/theme';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import { isBusLine } from '../utils/line';
import { getIsLocal, getIsRapid } from '../utils/trainTypeString';
import truncateTrainType from '../utils/truncateTrainType';

type Props = {
  trainType: TrainType | null;
};

const BOX_HEIGHT = isTablet ? 55 : 35;
const FONT_SIZE = isTablet ? 36 : 24;
const SKEW_ANGLE = 5;
const SKEW_SHIFT = Math.ceil(
  BOX_HEIGHT * Math.tan((SKEW_ANGLE * Math.PI) / 180)
);
const SKEW_TRANSFORM = `translate(${SKEW_SHIFT / 2}, 0) skewX(-${SKEW_ANGLE})`;

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: isTablet ? 24 : 12,
    borderRadius: 4,
    width: '100%',
    height: BOX_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    zIndex: 9999,
  },
});

const TrainTypeBoxJO: React.FC<Props> = ({ trainType }: Props) => {
  const { headerState } = useAtomValue(navigationState);
  const currentLine = useCurrentLine();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const headerLangState = useMemo((): HeaderLangState => {
    return headerState.split('_')[1] as HeaderLangState;
  }, [headerState]);

  const isBus = isBusLine(currentLine);

  const localTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return translate('localEn');
      case 'ZH':
        return translate('localZh');
      case 'KO':
        return translate('localKo');
      default:
        return translate('local2');
    }
  }, [headerLangState]);

  const trainTypeNameJa = (trainType?.name || localTypeText)?.replace(
    parenthesisRegexp,
    ''
  );
  const trainTypeNameR = truncateTrainType(
    trainType?.nameRoman || translate('localEn')
  );
  const trainTypeNameZh = truncateTrainType(
    trainType?.nameChinese || translate('localZh')
  );
  const trainTypeNameKo = truncateTrainType(
    trainType?.nameKorean || translate('localKo')
  );

  const lineNameJa = currentLine?.nameShort?.replace(parenthesisRegexp, '');

  const trainTypeName = useMemo(() => {
    if (isBus) {
      return lineNameJa?.split('\n')[0]?.trim();
    }
    switch (headerLangState) {
      case 'EN':
        return trainTypeNameR?.split('\n')[0]?.trim();
      case 'ZH':
        return trainTypeNameZh?.split('\n')[0]?.trim();
      case 'KO':
        return trainTypeNameKo?.split('\n')[0]?.trim();
      default:
        return trainTypeNameJa?.split('\n')[0]?.trim();
    }
  }, [
    isBus,
    headerLangState,
    lineNameJa,
    trainTypeNameJa,
    trainTypeNameKo,
    trainTypeNameR,
    trainTypeNameZh,
  ]);

  const trainTypeColor = useMemo(() => {
    if (getIsLocal(trainType)) {
      return '#222';
    }
    if (getIsRapid(trainType)) {
      return '#0067C0';
    }
    return trainType?.color ?? '#222';
  }, [trainType]);

  const fontFamily = useMemo(() => {
    if (isLEDTheme) {
      return FONTS.JFDotJiskan24h;
    }
    return FONTS.RobotoBold;
  }, [isLEDTheme]);

  const fontWeight = isLEDTheme ? ('normal' as const) : ('800' as const);

  const [boxWidth, setBoxWidth] = useState(0);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setBoxWidth(e.nativeEvent.layout.width);
  }, []);

  const isJapaneseChars =
    headerLangState !== 'EN' &&
    trainTypeName != null &&
    japaneseRegexp.test(trainTypeName);

  const chars = isJapaneseChars ? trainTypeName.split('') : null;

  const adjustedFontSize = useMemo(() => {
    if (!trainTypeName || boxWidth === 0 || chars) {
      return FONT_SIZE;
    }
    let estimatedWidth = 0;
    for (const ch of trainTypeName) {
      estimatedWidth +=
        ch.charCodeAt(0) > 0x2e80 ? FONT_SIZE : FONT_SIZE * 0.52;
    }
    const available = boxWidth * 0.9;
    if (estimatedWidth > available) {
      return Math.floor(FONT_SIZE * (available / estimatedWidth));
    }
    return FONT_SIZE;
  }, [trainTypeName, boxWidth, chars]);

  return (
    <View style={styles.box} onLayout={handleLayout}>
      <Svg width="100%" height={BOX_HEIGHT}>
        <G transform={SKEW_TRANSFORM}>
          {chars
            ? chars.map((char, i) => (
                <SvgText
                  key={`${char}_${i.toString()}`}
                  x={`${((i + 0.5) / chars.length) * 100}%`}
                  y={BOX_HEIGHT / 2}
                  fontSize={FONT_SIZE}
                  fontWeight={fontWeight}
                  fill={trainTypeColor}
                  textAnchor="middle"
                  alignmentBaseline="central"
                >
                  {char}
                </SvgText>
              ))
            : trainTypeName && (
                <SvgText
                  x="50%"
                  y={BOX_HEIGHT / 2}
                  fontSize={adjustedFontSize}
                  fontFamily={fontFamily}
                  fontWeight="bold"
                  fill={trainTypeColor}
                  textAnchor="middle"
                  alignmentBaseline="central"
                >
                  {trainTypeName}
                </SvgText>
              )}
        </G>
      </Svg>
    </View>
  );
};

export default React.memo(TrainTypeBoxJO);

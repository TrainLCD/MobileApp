import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { TrainType } from '~/@types/graphql';
import AnimatedTypography from '~/components/AnimatedTypography';
import { FONTS, parenthesisRegexp } from '../constants';
import { useCurrentLine } from '../hooks';
import { useTrainTypeNameFade } from '../hooks/useTrainTypeNameFade';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import { headerStateAtom } from '../store/atoms/navigation';
import { isLEDThemeAtom } from '../store/atoms/theme';
import tuningState from '../store/atoms/tuning';
import { translate } from '../translation';
import { computeTwoLineTypography } from '../utils/computeTwoLineTypography';
import isTablet from '../utils/isTablet';
import { isBusLine } from '../utils/line';
import truncateTrainType from '../utils/truncateTrainType';

type Props = {
  trainType: TrainType | null;
};

// 種別箱の内寸。styles と 2 行レイアウトの高さクランプで同じ値を使う必要があるため、
// 各所へ数値を直書きせず定数から参照する。
const BOX_WIDTH = isTablet ? 175 : 128;
const BOX_HEIGHT = isTablet ? 55 : 35;

const styles = StyleSheet.create({
  box: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: isTablet ? 8 : 4,
  },
  text: {
    color: '#000',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: isTablet ? 21 * 1.5 : 21,
  },
  textWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    // box より小さい旧値(96.25 x 30.25)が残っており、種別名が箱からはみ出して
    // 潰れる原因になっていたため box と同じ内寸に揃える。
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
  },
});

const TrainTypeBoxJRKyushu: React.FC<Props> = ({ trainType }: Props) => {
  const headerState = useAtomValue(headerStateAtom);
  const { headerTransitionDelay } = useAtomValue(tuningState);
  const currentLine = useCurrentLine();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const isBus = isBusLine(currentLine);

  const headerLangState = useMemo((): HeaderLangState => {
    return headerState.split('_')[1] as HeaderLangState;
  }, [headerState]);

  const localTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return translate('localEn');
      case 'ZH':
        return translate('localZh');
      case 'KO':
        return translate('localKo');
      default:
        return translate('local');
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
      return lineNameJa;
    }
    switch (headerLangState) {
      case 'EN':
        return trainTypeNameR;
      case 'ZH':
        return trainTypeNameZh;
      case 'KO':
        return trainTypeNameKo;
      default:
        return trainTypeNameJa;
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

  const letterSpacing = useMemo(() => {
    if (trainTypeName?.length === 2) {
      return 8;
    }
    return 0;
  }, [trainTypeName?.length]);

  const marginLeft = useMemo(() => {
    if (trainTypeName?.length === 2 && Platform.OS === 'ios') {
      return 8;
    }
    return 0;
  }, [trainTypeName?.length]);

  const { prevTrainTypeName, textOpacityAnim } = useTrainTypeNameFade(
    trainTypeName,
    headerTransitionDelay
  );
  const prevLetterSpacing = prevTrainTypeName?.length === 2 ? 8 : 0;
  const prevMarginLeft = Platform.OS === 'ios' ? prevLetterSpacing : 0;
  const animatedTextBaseStyle = useMemo(
    () => ({
      fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : FONTS.RobotoBold,
    }),
    [isLEDTheme]
  );

  const textTopAnimatedStyles = useMemo(
    () => ({
      opacity: textOpacityAnim,
    }),
    [textOpacityAnim]
  );
  const textBottomAnimatedStyles = useMemo(
    () => ({
      opacity: textOpacityAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
    }),
    [textOpacityAnim]
  );

  const numberOfLines = useMemo(
    // trainTypeNameがundefined/nullの場合のクラッシュを防ぐためのオプショナルチェーニング
    () => (trainTypeName?.split('\n').length === 1 ? 1 : 2),
    [trainTypeName]
  );
  const prevNumberOfLines = useMemo(
    // prevTrainTypeNameがundefined/nullの場合のクラッシュを防ぐためのオプショナルチェーニング
    () => (prevTrainTypeName?.split('\n').length === 1 ? 1 : 2),
    [prevTrainTypeName]
  );

  const {
    fontSize: computedFontSize,
    lineHeight: computedLineHeight,
    prevFontSize: prevComputedFontSize,
    prevLineHeight: prevComputedLineHeight,
  } = computeTwoLineTypography({
    baseFontSize: 21,
    isTablet,
    numberOfLines,
    prevNumberOfLines,
    maxHeight: BOX_HEIGHT,
  });

  return (
    <View>
      <View style={styles.box}>
        <View style={styles.textWrapper}>
          <AnimatedTypography
            style={[
              styles.text,
              animatedTextBaseStyle,
              isLEDTheme && { fontWeight: 'normal' as const },
              textTopAnimatedStyles,
              {
                letterSpacing,
                marginLeft,
                fontSize: computedFontSize,
                lineHeight: computedLineHeight,
              },
            ]}
            adjustsFontSizeToFit
            numberOfLines={numberOfLines}
          >
            {trainTypeName}
          </AnimatedTypography>
        </View>

        <AnimatedTypography
          style={[
            styles.text,
            animatedTextBaseStyle,
            isLEDTheme && { fontWeight: 'normal' as const },
            textBottomAnimatedStyles,
            {
              letterSpacing: prevLetterSpacing,
              marginLeft: prevMarginLeft,
              fontSize: prevComputedFontSize,
              lineHeight: prevComputedLineHeight,
            },
          ]}
          adjustsFontSizeToFit
          numberOfLines={prevNumberOfLines}
        >
          {prevTrainTypeName}
        </AnimatedTypography>
      </View>
    </View>
  );
};

export default React.memo(TrainTypeBoxJRKyushu);

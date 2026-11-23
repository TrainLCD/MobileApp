import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { TrainType } from '~/@types/graphql';
import AnimatedTypography from '~/components/AnimatedTypography';
import { FONTS, parenthesisRegexp } from '~/constants';
import { useCurrentLine } from '~/hooks';
import type { HeaderLangState } from '~/models/HeaderTransitionState';
import { headerStateAtom } from '~/store/atoms/navigation';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import tuningState from '~/store/atoms/tuning';
import { translate } from '~/translation';
import { computeTwoLineTypography } from '~/utils/computeTwoLineTypography';
import isTablet from '~/utils/isTablet';
import { isBusLine } from '~/utils/line';
import {
  getIsCommuterRapid,
  getIsLocal,
  getIsRapid,
} from '~/utils/trainTypeString';
import truncateTrainType from '~/utils/truncateTrainType';
import { useTrainTypeNameFade } from '../hooks/useTrainTypeNameFade';

type Props = {
  trainType: TrainType | null;
  lineColor: string;
};

// 種別箱の内寸。styles と 2 行レイアウトの高さクランプで同じ値を使う必要があるため、
// 各所へ数値を直書きせず定数から参照する。
const BOX_WIDTH = isTablet ? 175 : 96.25;
const BOX_HEIGHT = isTablet ? 55 : 30.25;

const styles = StyleSheet.create({
  root: {
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: isTablet ? 8 : 4,
    borderBottomRightRadius: isTablet ? 8 : 4,
    overflow: 'hidden',
    borderLeftWidth: isTablet ? 0.5 : 0.75,
    borderRightWidth: isTablet ? 0.5 : 0.75,
    borderBottomWidth: isTablet ? 0.5 : 0.75,
    borderColor: 'white',
  },
  container: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    borderBottomLeftRadius: isTablet ? 8 : 4,
    borderBottomRightRadius: isTablet ? 8 : 4,
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    position: 'absolute',
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    // 旧 shadow* の iOS 描画(グリフ影・既定オフセット (0, -3))を textShadow で踏襲
    textShadowColor: 'rgba(51, 51, 51, 0.25)',
    textShadowOffset: { width: 0, height: -3 },
    textShadowRadius: 1,
    fontSize: isTablet ? 18 * 1.5 : 18,
  },
  textWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
});

const TrainTypeBoxSaikyo: React.FC<Props> = ({
  trainType,
  lineColor,
}: Props) => {
  const headerState = useAtomValue(headerStateAtom);
  const { headerTransitionDelay } = useAtomValue(tuningState);
  const currentLine = useCurrentLine();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const isBus = isBusLine(currentLine);

  const trainTypeColor = useMemo(() => {
    if (getIsLocal(trainType)) {
      return lineColor;
    }
    if (getIsCommuterRapid(trainType)) {
      return '#dc143c';
    }
    if (getIsRapid(trainType)) {
      return '#1e8ad2';
    }

    return trainType?.color ?? lineColor;
  }, [lineColor, trainType]);
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

  const trainTypeNameR =
    truncateTrainType(trainType?.nameRoman || translate('localEn')) ?? '';

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

  const paddingLeft = useMemo(() => {
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
  const prevPaddingLeft = Platform.OS === 'ios' ? prevLetterSpacing : 0;
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
    baseFontSize: 18,
    isTablet,
    numberOfLines,
    prevNumberOfLines,
    maxHeight: BOX_HEIGHT,
  });

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#000', '#000', '#fff']}
          locations={[0.1, 0.5, 0.9]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={['#aaaaaaff', '#aaaaaabb']}
          style={styles.gradient}
        />
        <LinearGradient
          colors={['#000', '#000', '#fff']}
          locations={[0.1, 0.5, 0.9]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={[`${trainTypeColor}bb`, `${trainTypeColor}ff`]}
          style={styles.gradient}
        />

        <View style={styles.textWrapper}>
          <AnimatedTypography
            adjustsFontSizeToFit
            numberOfLines={numberOfLines}
            style={[
              styles.text,
              animatedTextBaseStyle,
              isLEDTheme && { fontWeight: 'normal' as const },
              textTopAnimatedStyles,
              {
                paddingLeft,
                letterSpacing,
                fontSize: computedFontSize,
                lineHeight: computedLineHeight,
              },
            ]}
          >
            {trainTypeName}
          </AnimatedTypography>
        </View>
        <View style={styles.textWrapper}>
          <AnimatedTypography
            adjustsFontSizeToFit
            numberOfLines={prevNumberOfLines}
            style={[
              styles.text,
              animatedTextBaseStyle,
              isLEDTheme && { fontWeight: 'normal' as const },
              textBottomAnimatedStyles,
              {
                paddingLeft: prevPaddingLeft,
                letterSpacing: prevLetterSpacing,
                fontSize: prevComputedFontSize,
                lineHeight: prevComputedLineHeight,
              },
            ]}
          >
            {prevTrainTypeName}
          </AnimatedTypography>
        </View>
      </View>
    </View>
  );
};

export default React.memo(TrainTypeBoxSaikyo);

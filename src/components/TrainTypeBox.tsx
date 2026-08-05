import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Easing,
  Platform,
  Animated as RNAnimated,
  StyleSheet,
  View,
} from 'react-native';
import type { TrainType } from '~/@types/graphql';
import { FONTS, parenthesisRegexp } from '../constants';
import {
  useCurrentLine,
  useLandscapeWindowDimensions,
  useLazyPrevious,
  useNextTrainType,
  usePrevious,
} from '../hooks';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import { APP_THEME, type AppTheme } from '../models/Theme';
import { headerStateAtom } from '../store/atoms/navigation';
import { themeAtom } from '../store/atoms/theme';
import tuningState from '../store/atoms/tuning';
import { translate } from '../translation';
import { computeTwoLineTypography } from '../utils/computeTwoLineTypography';
import isTablet from '../utils/isTablet';
import { isBusLine } from '../utils/line';
import truncateTrainType from '../utils/truncateTrainType';
import Typography from './Typography';

type Props = {
  trainType: TrainType | null;
  localTypePrefix?: string;
  nextTrainTypeColor?: string;
  darkenColor?: boolean;
  fontSizeScale?: number;
};

export const resolveTrainTypeFontFamily = (
  theme: AppTheme,
  headerLangState: HeaderLangState
): string | undefined => {
  // バンドル済みのRoboto/JF Dotはいずれもハングルを収録していないため、
  // 韓国語ではOSのフォールバックフォントを使用する。
  if (headerLangState === 'KO') {
    return undefined;
  }
  return theme === APP_THEME.LED ? FONTS.JFDotJiskan24h : FONTS.RobotoBold;
};

const styles = StyleSheet.create({
  box: {
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
    position: 'absolute',
    borderRadius: 4,
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
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
  },
  nextTrainTypeWrapper: {
    position: 'absolute',
    top: isTablet ? 55 : 30.25,
    alignItems: 'flex-start',
    overflow: 'visible',
    marginTop: 4,
  },
  nextTrainType: {
    fontWeight: 'bold',
    fontSize: isTablet ? 18 : 12,
  },
});

const TrainTypeBox: React.FC<Props> = ({
  trainType,
  localTypePrefix = '',
  nextTrainTypeColor = '#444',
  darkenColor = false,
  fontSizeScale: fontSizeScaleRaw = 1,
}: Props) => {
  const fontSizeScale = Math.max(fontSizeScaleRaw, 0.1);
  const [fadeOutFinished, setFadeOutFinished] = useState(false);

  const { width: windowWidth } = useLandscapeWindowDimensions();
  const headerState = useAtomValue(headerStateAtom);
  const { headerTransitionDelay } = useAtomValue(tuningState);
  const theme = useAtomValue(themeAtom);
  const currentLine = useCurrentLine();
  const nextTrainType = useNextTrainType();

  const textOpacityAnim = useRef(new RNAnimated.Value(0)).current;

  const trainTypeColor = useMemo(() => {
    const base = trainType?.color ?? '#1f63c6';
    return base;
  }, [trainType]);
  const headerLangState = useMemo((): HeaderLangState => {
    return headerState.split('_')[1] as HeaderLangState;
  }, [headerState]);

  const isBus = isBusLine(currentLine);

  const localKey = localTypePrefix ? 'Local' : 'local';

  const localTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return translate(`${localTypePrefix}${localKey}En`);
      case 'ZH':
        return translate(`${localTypePrefix}${localKey}Zh`);
      case 'KO':
        return translate(`${localTypePrefix}${localKey}Ko`);
      default:
        return translate(`${localTypePrefix}${localKey}`);
    }
  }, [headerLangState, localTypePrefix, localKey]);

  const trainTypeNameJa = (trainType?.name || localTypeText)?.replace(
    parenthesisRegexp,
    ''
  );
  const trainTypeNameR = truncateTrainType(
    trainType?.nameRoman || translate(`${localTypePrefix}${localKey}En`)
  );
  const trainTypeNameZh = truncateTrainType(
    trainType?.nameChinese || translate(`${localTypePrefix}${localKey}Zh`)
  );
  const trainTypeNameKo = truncateTrainType(
    trainType?.nameKorean || translate(`${localTypePrefix}${localKey}Ko`)
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

  const prevMarginLeft = usePrevious(marginLeft);
  const prevLetterSpacing = usePrevious(letterSpacing);
  const animatedTextBaseStyle = useMemo(
    () => ({
      fontFamily: resolveTrainTypeFontFamily(theme, headerLangState),
      fontWeight:
        theme === APP_THEME.LED && headerLangState !== 'KO'
          ? ('normal' as const)
          : ('bold' as const),
    }),
    [headerLangState, theme]
  );

  const trainTypeDisplayState = useMemo(
    () => ({
      name: trainTypeName,
      headerLangState,
      textStyle: animatedTextBaseStyle,
    }),
    [animatedTextBaseStyle, headerLangState, trainTypeName]
  );
  const prevTrainTypeDisplayState = useLazyPrevious(
    trainTypeDisplayState,
    fadeOutFinished
  );
  const prevTrainTypeName = prevTrainTypeDisplayState.name;

  const handleFinish = useCallback((finished: boolean | undefined) => {
    if (finished) {
      setFadeOutFinished(true);
    }
  }, []);

  const resetValue = useCallback(() => {
    textOpacityAnim.setValue(0);
  }, [textOpacityAnim]);

  const updateOpacity = useCallback(() => {
    RNAnimated.timing(textOpacityAnim, {
      toValue: 1,
      duration: headerTransitionDelay,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      handleFinish(finished);
    });
  }, [handleFinish, headerTransitionDelay, textOpacityAnim]);

  // 表示内容または表示設定が変更されたときのみfadeOutFinishedをリセット
  // biome-ignore lint/correctness/useExhaustiveDependencies: 前回表示状態の変更時にもアニメーション状態をリセットする必要がある
  useEffect(() => {
    setFadeOutFinished(false);
  }, [trainTypeDisplayState, prevTrainTypeDisplayState]);

  useEffect(() => {
    if (prevTrainTypeDisplayState !== trainTypeDisplayState) {
      updateOpacity();
    } else {
      resetValue();
    }
  }, [
    prevTrainTypeDisplayState,
    resetValue,
    trainTypeDisplayState,
    updateOpacity,
  ]);

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

  const nextTrainTypeCompanyName = useMemo(() => {
    const company = nextTrainType?.line?.company;
    if (!company) {
      return null;
    }
    return headerLangState === 'EN'
      ? (company.nameEnglishShort ?? company.nameShort ?? null)
      : (company.nameShort ?? company.nameEnglishShort ?? null);
  }, [nextTrainType, headerLangState]);

  const showNextTrainType = useMemo(
    () =>
      !!(
        nextTrainTypeCompanyName &&
        nextTrainType?.line &&
        currentLine?.company?.id !== nextTrainType.line.company?.id
      ),
    [currentLine, nextTrainType, nextTrainTypeCompanyName]
  );

  const nextTrainTypeWrapperStyle = useMemo(
    () => [styles.nextTrainTypeWrapper, { width: windowWidth }],
    [windowWidth]
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
    fontSizeScale,
    numberOfLines,
    prevNumberOfLines,
  });

  return (
    <View>
      <View style={styles.box}>
        <LinearGradient
          colors={['#aaa', '#000', '#000', '#aaa']}
          locations={
            darkenColor ? [0.35, 0.35, 0.35, 0.9] : [0.5, 0.5, 0.5, 0.9]
          }
          style={styles.gradient}
        />
        <LinearGradient
          colors={[`${trainTypeColor}ee`, `${trainTypeColor}aa`]}
          style={styles.gradient}
        />
        {darkenColor ? (
          <>
            <LinearGradient
              colors={['#00000000', '#00000033', '#00000000']}
              locations={[0.35, 0.55, 0.85]}
              style={styles.gradient}
            />
            <LinearGradient
              colors={['#ffffff44', '#ffffff11', '#00000000']}
              locations={[0, 0.35, 0.35]}
              style={styles.gradient}
            />
          </>
        ) : null}

        <View style={styles.textWrapper}>
          <RNAnimated.Text
            style={[
              textTopAnimatedStyles,
              [
                styles.text,
                animatedTextBaseStyle,
                {
                  letterSpacing,
                  marginLeft,
                  fontSize: computedFontSize,
                  lineHeight: computedLineHeight,
                },
              ],
            ]}
            adjustsFontSizeToFit
            numberOfLines={numberOfLines}
          >
            {trainTypeName}
          </RNAnimated.Text>
        </View>

        <RNAnimated.Text
          style={[
            styles.text,
            prevTrainTypeDisplayState.textStyle,
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
        </RNAnimated.Text>
      </View>
      {showNextTrainType && nextTrainType?.nameRoman ? (
        <View style={nextTrainTypeWrapperStyle}>
          <Typography
            style={[
              styles.nextTrainType,
              {
                color: nextTrainTypeColor,
              },
            ]}
          >
            {headerLangState === 'EN'
              ? `${nextTrainTypeCompanyName} Line ${truncateTrainType(
                  nextTrainType.nameRoman?.replace(parenthesisRegexp, ''),
                  true
                )}`
              : `${nextTrainTypeCompanyName}線内 ${nextTrainType.name?.replace(parenthesisRegexp, '')}`}
          </Typography>
        </View>
      ) : null}
    </View>
  );
};

export default React.memo(TrainTypeBox);

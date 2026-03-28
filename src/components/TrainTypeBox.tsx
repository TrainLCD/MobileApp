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
import { useCurrentLine, useLazyPrevious, usePrevious } from '../hooks';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import { APP_THEME } from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import { themeAtom } from '../store/atoms/theme';
import tuningState from '../store/atoms/tuning';
import { translate } from '../translation';
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
    shadowOpacity: 0.25,
    shadowColor: '#333',
    shadowRadius: 1,
    elevation: 5,
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

  const { headerState } = useAtomValue(navigationState);
  const { headerTransitionDelay } = useAtomValue(tuningState);
  const theme = useAtomValue(themeAtom);
  const currentLine = useCurrentLine();

  const textOpacityAnim = useRef(new RNAnimated.Value(0)).current;

  // trainType.linesから現在路線以外の中間路線を取得し、路線名と種別を一元的に参照する
  const intermediateLineEntry = useMemo(
    () => trainType?.lines?.find((l) => l.id !== currentLine?.id) ?? null,
    [trainType, currentLine]
  );

  const trainTypeColor = useMemo(() => {
    const base = trainType?.color ?? '#1f63c6';
    return base;
  }, [trainType]);
  const headerLangState = useMemo((): HeaderLangState => {
    return headerState.split('_')[1] as HeaderLangState;
  }, [headerState]);

  const isBus = isBusLine(currentLine);

  const localTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return translate(`${localTypePrefix}localEn`);
      case 'ZH':
        return translate(`${localTypePrefix}localZh`);
      case 'KO':
        return translate(`${localTypePrefix}localKo`);
      default:
        return translate(`${localTypePrefix}local`);
    }
  }, [headerLangState, localTypePrefix]);

  const trainTypeNameJa = (trainType?.name || localTypeText)?.replace(
    parenthesisRegexp,
    ''
  );
  const trainTypeNameR = truncateTrainType(
    trainType?.nameRoman || translate(`${localTypePrefix}localEn`)
  );
  const trainTypeNameZh = truncateTrainType(
    trainType?.nameChinese || translate(`${localTypePrefix}localZh`)
  );
  const trainTypeNameKo = truncateTrainType(
    trainType?.nameKorean || translate(`${localTypePrefix}localKo`)
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
      fontFamily:
        theme === APP_THEME.LED ? FONTS.JFDotJiskan24h : FONTS.RobotoBold,
    }),
    [theme]
  );

  const prevTrainTypeName = useLazyPrevious(trainTypeName, fadeOutFinished);

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

  // 電車種別が変更されたときのみfadeOutFinishedをリセット
  // biome-ignore lint/correctness/useExhaustiveDependencies: prevTrainTypeNameの変更時にもアニメーション状態をリセットする必要がある
  useEffect(() => {
    setFadeOutFinished(false);
  }, [trainTypeName, prevTrainTypeName]);

  useEffect(() => {
    if (prevTrainTypeName !== trainTypeName) {
      updateOpacity();
    } else {
      resetValue();
    }
  }, [prevTrainTypeName, resetValue, trainTypeName, updateOpacity]);

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

  const showNextTrainType = useMemo(
    () =>
      !!(
        intermediateLineEntry &&
        currentLine?.company?.id !== intermediateLineEntry.company?.id
      ),
    [currentLine, intermediateLineEntry]
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
                theme === APP_THEME.LED && { fontWeight: 'normal' as const },
                {
                  letterSpacing,
                  marginLeft,
                  fontSize: (isTablet ? 18 * 1.5 : 18) * fontSizeScale,
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
            animatedTextBaseStyle,
            theme === APP_THEME.LED && { fontWeight: 'normal' as const },
            textBottomAnimatedStyles,
            {
              letterSpacing: prevLetterSpacing,
              marginLeft: prevMarginLeft,
              fontSize: (isTablet ? 18 * 1.5 : 18) * fontSizeScale,
            },
          ]}
          adjustsFontSizeToFit
          numberOfLines={prevNumberOfLines}
        >
          {prevTrainTypeName}
        </RNAnimated.Text>
      </View>
      {showNextTrainType && intermediateLineEntry?.trainType?.nameRoman ? (
        <View style={styles.nextTrainTypeWrapper}>
          <Typography
            style={[
              styles.nextTrainType,
              {
                color: nextTrainTypeColor,
              },
            ]}
          >
            {headerState.split('_')[1] === 'EN'
              ? `${intermediateLineEntry?.company?.nameEnglishShort} Line ${truncateTrainType(
                  intermediateLineEntry?.trainType?.nameRoman?.replace(
                    parenthesisRegexp,
                    ''
                  ),
                  true
                )}`
              : `${
                  intermediateLineEntry?.company?.nameShort
                }線内 ${intermediateLineEntry?.trainType?.name?.replace(parenthesisRegexp, '')}`}
          </Typography>
        </View>
      ) : null}
    </View>
  );
};

export default React.memo(TrainTypeBox);

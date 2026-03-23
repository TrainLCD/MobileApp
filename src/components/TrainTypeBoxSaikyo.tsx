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
import { FONTS, parenthesisRegexp } from '~/constants';
import { useCurrentLine, useLazyPrevious, usePrevious } from '~/hooks';
import type { HeaderLangState } from '~/models/HeaderTransitionState';
import navigationState from '~/store/atoms/navigation';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import tuningState from '~/store/atoms/tuning';
import { translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { isBusLine } from '~/utils/line';
import { getIsLocal, getIsRapid } from '~/utils/trainTypeString';
import truncateTrainType from '~/utils/truncateTrainType';

type Props = {
  trainType: TrainType | null;
  lineColor: string;
};

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
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
    borderBottomLeftRadius: isTablet ? 8 : 4,
    borderBottomRightRadius: isTablet ? 8 : 4,
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
    position: 'absolute',
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
  const [fadeOutFinished, setFadeOutFinished] = useState(false);

  const { headerState } = useAtomValue(navigationState);
  const { headerTransitionDelay } = useAtomValue(tuningState);
  const currentLine = useCurrentLine();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const textOpacityAnim = useRef(new RNAnimated.Value(0)).current;

  const isBus = isBusLine(currentLine);

  const trainTypeColor = useMemo(() => {
    if (getIsLocal(trainType)) {
      return lineColor;
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

  const prevPaddingLeft = usePrevious(paddingLeft);
  const prevTrainTypeText = usePrevious(trainTypeName);
  const prevLetterSpacing = usePrevious(letterSpacing);
  const animatedTextBaseStyle = useMemo(
    () => ({
      fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : FONTS.RobotoBold,
    }),
    [isLEDTheme]
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

  const numberOfLines = useMemo(
    // trainTypeNameがundefined/nullの場合のクラッシュを防ぐためのオプショナルチェーニング
    () => (trainTypeName?.split('\n').length === 1 ? 1 : 2),
    [trainTypeName]
  );
  const prevNumberOfLines = useMemo(
    // prevTrainTypeTextがundefined/nullの場合のクラッシュを防ぐためのオプショナルチェーニング
    () => (prevTrainTypeText?.split('\n').length === 1 ? 1 : 2),
    [prevTrainTypeText]
  );

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
          <RNAnimated.Text
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
              },
            ]}
          >
            {trainTypeName}
          </RNAnimated.Text>
        </View>
        <View style={styles.textWrapper}>
          <RNAnimated.Text
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
              },
            ]}
          >
            {prevTrainTypeText}
          </RNAnimated.Text>
        </View>
      </View>
    </View>
  );
};

export default React.memo(TrainTypeBoxSaikyo);

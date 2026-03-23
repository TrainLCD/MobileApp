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
import navigationState from '../store/atoms/navigation';
import { isLEDThemeAtom } from '../store/atoms/theme';
import tuningState from '../store/atoms/tuning';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import { isBusLine } from '../utils/line';
import truncateTrainType from '../utils/truncateTrainType';

type Props = {
  trainType: TrainType | null;
};

const styles = StyleSheet.create({
  box: {
    width: isTablet ? 175 : 128,
    height: isTablet ? 55 : 35,
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
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
  },
  nextTrainType: {
    fontWeight: 'bold',
    fontSize: isTablet ? 18 : 12,
    marginTop: 4,
    position: 'absolute',
    top: isTablet ? 55 : 30.25,
    width: '100%',
  },
});

const TrainTypeBoxJRKyushu: React.FC<Props> = ({ trainType }: Props) => {
  const [fadeOutFinished, setFadeOutFinished] = useState(false);

  const { headerState } = useAtomValue(navigationState);
  const { headerTransitionDelay } = useAtomValue(tuningState);
  const currentLine = useCurrentLine();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const textOpacityAnim = useRef(new RNAnimated.Value(0)).current;

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

  const prevMarginLeft = usePrevious(marginLeft);
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
    // prevTrainTypeNameがundefined/nullの場合のクラッシュを防ぐためのオプショナルチェーニング
    () => (prevTrainTypeName?.split('\n').length === 1 ? 1 : 2),
    [prevTrainTypeName]
  );

  return (
    <View>
      <View style={styles.box}>
        <View style={styles.textWrapper}>
          <RNAnimated.Text
            style={[
              styles.text,
              animatedTextBaseStyle,
              isLEDTheme && { fontWeight: 'normal' as const },
              textTopAnimatedStyles,
              {
                letterSpacing,
                marginLeft,
              },
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
            isLEDTheme && { fontWeight: 'normal' as const },
            textBottomAnimatedStyles,
            {
              letterSpacing: prevLetterSpacing,
              marginLeft: prevMarginLeft,
            },
          ]}
          adjustsFontSizeToFit
          numberOfLines={prevNumberOfLines}
        >
          {prevTrainTypeName}
        </RNAnimated.Text>
      </View>
    </View>
  );
};

export default React.memo(TrainTypeBoxJRKyushu);

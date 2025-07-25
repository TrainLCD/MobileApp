import { useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { TrainType } from '~/gen/proto/stationapi_pb';
import { parenthesisRegexp } from '../constants';
import { useLazyPrevious, useMountedRef, usePrevious } from '../hooks';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import tuningState from '../store/atoms/tuning';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import truncateTrainType from '../utils/truncateTrainType';
import Typography from './Typography';

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
    width: Dimensions.get('screen').width,
  },
});

const AnimatedTypography = Animated.createAnimatedComponent(Typography);

const TrainTypeBoxJRKyushu: React.FC<Props> = ({ trainType }: Props) => {
  const [fadeOutFinished, setFadeOutFinished] = useState(false);

  const { headerState } = useAtomValue(navigationState);
  const { headerTransitionDelay } = useAtomValue(tuningState);

  const isMountedRef = useMountedRef();

  const textOpacityAnim = useSharedValue(0);

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

  const trainTypeName = useMemo(() => {
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
    headerLangState,
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

  const prevTrainTypeName = useLazyPrevious(trainTypeName, fadeOutFinished);

  const resetValue = useCallback(() => {
    textOpacityAnim.value = 0;
  }, [textOpacityAnim]);

  const updateOpacity = useCallback(() => {
    textOpacityAnim.value = withTiming(
      1,
      {
        duration: headerTransitionDelay,
        easing: Easing.ease,
      },
      (finished) =>
        runOnJS((finished) => {
          if (finished && isMountedRef.current) {
            setFadeOutFinished(true);
          }
        })(finished)
    );
  }, [headerTransitionDelay, textOpacityAnim, isMountedRef.current]);

  useEffect(() => {
    setFadeOutFinished(false);

    if (prevTrainTypeName !== trainTypeName) {
      updateOpacity();
    } else {
      resetValue();
    }
  }, [prevTrainTypeName, resetValue, trainTypeName, updateOpacity]);

  const textTopAnimatedStyles = useAnimatedStyle(() => ({
    opacity: textOpacityAnim.value,
  }));
  const textBottomAnimatedStyles = useAnimatedStyle(() => ({
    opacity: 1 - textOpacityAnim.value,
  }));

  const numberOfLines = useMemo(
    () => (trainTypeName.split('\n').length === 1 ? 1 : 2),
    [trainTypeName]
  );
  const prevNumberOfLines = useMemo(
    () => (prevTrainTypeName.split('\n').length === 1 ? 1 : 2),
    [prevTrainTypeName]
  );

  return (
    <View>
      <View style={styles.box}>
        <View style={styles.textWrapper}>
          <AnimatedTypography
            style={[
              textTopAnimatedStyles,
              {
                ...styles.text,
                letterSpacing,
                marginLeft,
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
            textBottomAnimatedStyles,
            {
              ...styles.text,
              letterSpacing: prevLetterSpacing,
              marginLeft: prevMarginLeft,
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

import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useRecoilValue } from 'recoil';
import type { TrainType } from '../../gen/proto/stationapi_pb';
import { parenthesisRegexp } from '../constants';
import useLazyPrevious from '../hooks/useLazyPrevious';
import { usePrevious } from '../hooks/usePrevious';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import tuningState from '../store/atoms/tuning';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import { getIsLocal, getIsRapid } from '../utils/trainTypeString';
import truncateTrainType from '../utils/truncateTrainType';
import Typography from './Typography';

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
    shadowColor: '#000',
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

const AnimatedTypography = Animated.createAnimatedComponent(Typography);

const TrainTypeBoxSaikyo: React.FC<Props> = ({
  trainType,
  lineColor,
}: Props) => {
  const [fadeOutFinished, setFadeOutFinished] = useState(false);

  const { headerState } = useRecoilValue(navigationState);
  const { headerTransitionDelay } = useRecoilValue(tuningState);

  const textOpacityAnim = useSharedValue(0);

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

  const paddingLeft = useMemo(() => {
    if (trainTypeName?.length === 2 && Platform.OS === 'ios') {
      return 8;
    }

    return 0;
  }, [trainTypeName?.length]);

  const prevPaddingLeft = usePrevious(paddingLeft);
  const prevTrainTypeText = usePrevious(trainTypeName);
  const prevLetterSpacing = usePrevious(letterSpacing);

  const prevTrainTypeName = useLazyPrevious(trainTypeName, fadeOutFinished);

  const handleFinish = useCallback((finished: boolean | undefined) => {
    if (finished) {
      setFadeOutFinished(true);
    }
  }, []);

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
      (finished) => runOnJS(handleFinish)(finished)
    );
  }, [handleFinish, headerTransitionDelay, textOpacityAnim]);

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
    () => (trainTypeName.length <= 10 ? 1 : 2),
    [trainTypeName.length]
  );
  const prevNumberOfLines = useMemo(
    () => ((prevTrainTypeText?.length ?? 0) <= 10 ? 1 : 2),
    [prevTrainTypeText?.length]
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
          <AnimatedTypography
            adjustsFontSizeToFit
            numberOfLines={numberOfLines}
            style={[
              textTopAnimatedStyles,
              {
                ...styles.text,
                paddingLeft,
                letterSpacing,
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
              textBottomAnimatedStyles,
              {
                ...styles.text,
                paddingLeft: prevPaddingLeft,
                letterSpacing: prevLetterSpacing,
              },
            ]}
          >
            {prevTrainTypeText}
          </AnimatedTypography>
        </View>
      </View>
    </View>
  );
};

export default React.memo(TrainTypeBoxSaikyo);

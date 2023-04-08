import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  EasingNode,
  sub,
  timing,
  useValue,
} from 'react-native-reanimated';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import truncateTrainType from '../constants/truncateTrainType';
import useCurrentLine from '../hooks/useCurrentLine';
import useLazyPrevious from '../hooks/useLazyPrevious';
import useNextLine from '../hooks/useNextLine';
import useNextTrainType from '../hooks/useNextTrainType';
import { HeaderLangState } from '../models/HeaderTransitionState';
import { APITrainType, APITrainTypeMinimum } from '../models/StationAPI';
import { APP_THEME } from '../models/Theme';
import { TrainType } from '../models/TrainType';
import navigationState from '../store/atoms/navigation';
import themeState from '../store/atoms/theme';
import tuningState from '../store/atoms/tuning';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';

type Props = {
  trainType: APITrainType | APITrainTypeMinimum | TrainType;
  isTY?: boolean;
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
    shadowColor: '#000',
    shadowRadius: 1,
    elevation: 5,
    fontSize: isTablet ? 18 * 1.5 : 18,
    maxWidth: isTablet ? 175 : 96.25,
    maxHeight: isTablet ? 55 : 30.25,
  },
  textWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: isTablet ? 175 : 96.25,
    height: isTablet ? 55 : 30.25,
    position: 'absolute',
  },
  nextTrainType: {
    fontWeight: 'bold',
    fontSize: isTablet ? 18 : 12,
    marginTop: 4,
    position: 'absolute',
    top: isTablet ? 55 : 30.25,
    width: Dimensions.get('window').width,
  },
});

const TrainTypeBox: React.FC<Props> = ({ trainType, isTY }: Props) => {
  const { headerState } = useRecoilValue(navigationState);
  const { theme } = useRecoilValue(themeState);
  const { headerTransitionDelay } = useRecoilValue(tuningState);
  const textOpacityAnim = useValue<0 | 1>(0);
  const [animationFinished, setAnimationFinished] = useState(false);

  const currentLine = useCurrentLine();
  const nextTrainType = useNextTrainType();
  const nextLine = useNextLine();

  const trainTypeColor = useMemo(() => {
    if (typeof trainType !== 'string') {
      return trainType?.color;
    }

    switch (trainType) {
      case 'local':
        return '#1f63c6';
      case 'rapid':
        return '#dc143c';
      case 'ltdexp':
        return '#fd5a2a';
      default:
        return '#dc143c';
    }
  }, [trainType]);

  const headerLangState = useMemo((): HeaderLangState => {
    return headerState.split('_')[1] as HeaderLangState;
  }, [headerState]);

  const localTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return isTY ? translate('tyLocalEn') : translate('localEn');
      case 'ZH':
        return isTY ? translate('tyLocalZh') : translate('localZh');
      case 'KO':
        return isTY ? translate('tyLocalKo') : translate('localKo');
      default:
        return isTY ? translate('tyLocal') : translate('local');
    }
  }, [headerLangState, isTY]);

  const trainTypeNameJa = (
    (trainType as APITrainTypeMinimum).name || localTypeText
  )?.replace(parenthesisRegexp, '');
  const trainTypeNameR = truncateTrainType(
    (trainType as APITrainTypeMinimum).nameR || translate('localEn')
  );
  const trainTypeNameZh = truncateTrainType(
    (trainType as APITrainTypeMinimum).nameZh || translate('localZh')
  );
  const trainTypeNameKo = truncateTrainType(
    (trainType as APITrainTypeMinimum).nameKo || translate('localKo')
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

  const rapidTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return isTY ? translate('tyRapidEn') : translate('rapidEn');
      case 'ZH':
        return isTY ? translate('tyRapidZh') : translate('rapidZh');
      case 'KO':
        return isTY ? translate('tyRapidKo') : translate('rapidKo');
      default:
        return isTY ? translate('rapid') : translate('rapid');
    }
  }, [headerLangState, isTY]);
  const ltdExpTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return truncateTrainType(translate('ltdExpEn'));
      case 'ZH':
        return translate('ltdExpZh');
      case 'KO':
        return translate('ltdExpKo');
      default:
        return translate('ltdExp');
    }
  }, [headerLangState]);

  const animateAsync = useCallback(
    () =>
      new Promise<void>((resolve) => {
        timing(textOpacityAnim, {
          toValue: 0,
          duration: headerTransitionDelay,
          easing: EasingNode.ease,
        }).start(({ finished }) => finished && resolve());
      }),
    [headerTransitionDelay, textOpacityAnim]
  );

  const letterSpacing = useMemo(() => {
    if (!headerLangState || trainTypeName?.length === 2) {
      if ((isTY && trainType === 'local') || trainType === 'rapid') {
        return 8;
      }
    }
    if (trainTypeName?.length === 2 && isTY) {
      return 8;
    }
    return 0;
  }, [headerLangState, isTY, trainType, trainTypeName?.length]);

  const prevLetterSpacing = useLazyPrevious(letterSpacing, animationFinished);

  const paddingLeft = useMemo(() => {
    if (Platform.OS === 'android' && !isTablet) {
      return 0;
    }
    if (!headerLangState || trainTypeName?.length === 2) {
      if ((isTY && trainType === 'local') || trainType === 'rapid') {
        return 8;
      }
    }
    if (trainTypeName?.length === 2 && isTY) {
      return 8;
    }
    return 0;
  }, [headerLangState, isTY, trainType, trainTypeName?.length]);

  const prevPaddingLeft = useLazyPrevious(paddingLeft, animationFinished);

  const trainTypeText = useMemo(() => {
    switch (trainType) {
      case 'local':
        return localTypeText;
      case 'rapid':
        return rapidTypeText;
      case 'ltdexp':
        return ltdExpTypeText;
      default:
        if (typeof trainType === 'string') {
          return '';
        }
        return trainTypeName ?? '';
    }
  }, [localTypeText, ltdExpTypeText, rapidTypeText, trainType, trainTypeName]);

  const prevTrainTypeText = useLazyPrevious(trainTypeText, animationFinished);

  useEffect(() => {
    const updateAsync = async () => {
      setAnimationFinished(false);
      if (trainTypeText !== prevTrainTypeText) {
        await animateAsync();
        setAnimationFinished(true);
      }
    };
    updateAsync();
  }, [animateAsync, prevTrainTypeText, trainTypeText]);

  useEffect(() => {
    if (prevTrainTypeText !== trainTypeText) {
      textOpacityAnim.setValue(1);
    }
  }, [headerState, prevTrainTypeText, textOpacityAnim, trainTypeText]);

  const textTopAnimatedStyles = {
    opacity: sub(1, textOpacityAnim),
  };

  const textBottomAnimatedStyles = {
    opacity: textOpacityAnim,
  };

  const showNextTrainType = useMemo(
    () => !!(nextLine && currentLine?.companyId !== nextLine?.companyId),
    [currentLine, nextLine]
  );

  return (
    <View>
      <View style={styles.box}>
        <LinearGradient
          colors={['#aaa', '#000', '#000', '#aaa']}
          locations={[0.5, 0.5, 0.5, 0.9]}
          style={styles.gradient}
        />
        <LinearGradient
          colors={[`${trainTypeColor}ee`, `${trainTypeColor}aa`]}
          style={styles.gradient}
        />

        <Animated.View style={[styles.textWrapper, textTopAnimatedStyles]}>
          <Text
            adjustsFontSizeToFit
            numberOfLines={2}
            style={[
              {
                ...styles.text,
                paddingLeft,
                letterSpacing,
              },
            ]}
          >
            {trainTypeText}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.textWrapper, textBottomAnimatedStyles]}>
          <Text
            adjustsFontSizeToFit
            numberOfLines={2}
            style={[
              {
                ...styles.text,
                paddingLeft: prevPaddingLeft,
                letterSpacing: prevLetterSpacing,
              },
            ]}
          >
            {prevTrainTypeText}
          </Text>
        </Animated.View>
      </View>
      {showNextTrainType && nextTrainType?.nameR ? (
        <Text
          style={[
            styles.nextTrainType,
            {
              color: theme === APP_THEME.TY ? '#fff' : '#444',
            },
          ]}
        >
          {headerState.split('_')[1] === 'EN'
            ? `${nextLine?.company?.nameEn} Line ${truncateTrainType(
                nextTrainType?.nameR?.replace(parenthesisRegexp, ''),
                true
              )}`
            : `${nextLine?.company?.nameR}線内 ${nextTrainType?.name?.replace(
                parenthesisRegexp,
                ''
              )}`}
        </Text>
      ) : null}
    </View>
  );
};

TrainTypeBox.defaultProps = {
  isTY: false,
};

export default React.memo(TrainTypeBox);

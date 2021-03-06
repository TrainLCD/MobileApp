import React, { useEffect, useMemo } from 'react';
import { Platform, PlatformIOSStatic, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRecoilValue } from 'recoil';
import Animated, {
  Easing,
  sub,
  timing,
  useValue,
} from 'react-native-reanimated';
import { RFValue } from 'react-native-responsive-fontsize';
import { translate } from '../../translation';
import { TrainType } from '../../models/TrainType';
import navigationState from '../../store/atoms/navigation';
import useValueRef from '../../hooks/useValueRef';
import { HEADER_CONTENT_TRANSITION_DELAY } from '../../constants';
import { APITrainType } from '../../models/StationAPI';
import { parenthesisRegexp } from '../../constants/regexp';
import truncateTrainType from '../../constants/truncateTrainType';
import { HeaderLangState } from '../../models/HeaderTransitionState';

type Props = {
  trainType: APITrainType | TrainType;
  isTY?: boolean;
};

const { isPad } = Platform as PlatformIOSStatic;

const styles = StyleSheet.create({
  root: {
    width: isPad ? 175 : 96.25,
    height: isPad ? 55 : 30.25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    width: isPad ? 175 : 96.25,
    height: isPad ? 55 : 30.25,
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
    position: 'absolute',
  },
  textWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const TrainTypeBox: React.FC<Props> = ({ trainType, isTY }: Props) => {
  const { headerState } = useRecoilValue(navigationState);
  const textOpacityAnim = useValue<0 | 1>(0);

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

  const headerLangState = ((): HeaderLangState => {
    return headerState.split('_')[1] as HeaderLangState;
  })();

  const localTypeText = (() => {
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
  })();

  const trainTypeNameJa = (
    (trainType as APITrainType).name || localTypeText
  )?.replace(parenthesisRegexp, '');
  const trainTypeNameR = truncateTrainType(
    (trainType as APITrainType).nameR || translate('localEn')
  );
  const trainTypeNameZh = truncateTrainType(
    (trainType as APITrainType).nameZh || translate('localZh')
  );
  const trainTypeNameKo = truncateTrainType(
    (trainType as APITrainType).nameKo || translate('localKo')
  );

  const trainTypeName = (() => {
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
  })();

  const rapidTypeText = (() => {
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
  })();
  const ltdExpTypeText = (() => {
    switch (headerLangState) {
      case 'EN':
        return 'ltdExpEn';
      case 'ZH':
        return 'ltdExpZh';
      case 'KO':
        return 'ltdExpKo';
      default:
        return 'ltdExp';
    }
  })();

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
        return trainTypeName;
    }
  }, [localTypeText, ltdExpTypeText, rapidTypeText, trainType, trainTypeName]);

  const prevTrainTypeText = useValueRef(trainTypeText).current;

  const isEn = headerLangState === 'EN';

  const fontSize = useMemo((): number => {
    if (isPad) {
      if (!isTY && !isEn && trainType !== 'ltdexp' && !trainTypeName) {
        return 21;
      }
      if (!isEn && trainTypeName?.length <= 5) {
        return 21;
      }
      if (isEn && (trainType === 'ltdexp' || trainTypeNameR?.length > 10)) {
        return 16;
      }
      if (isEn && (trainType === 'ltdexp' || trainTypeNameR?.length >= 5)) {
        return 21;
      }
      return 16;
    }

    if (!isTY && !isEn && trainType !== 'ltdexp' && !trainTypeName) {
      return 21;
    }
    if (!isEn && trainTypeName?.length <= 5) {
      return 16;
    }
    if (isEn && (trainType === 'ltdexp' || trainTypeNameR?.length > 10)) {
      return 11;
    }
    return 14;
  }, [isEn, isTY, trainType, trainTypeName, trainTypeNameR?.length]);
  const prevFontSize = useValueRef(fontSize).current;

  const letterSpacing = useMemo((): number => {
    if (!headerLangState || trainTypeName?.length === 2) {
      if (
        (isTY && trainType === 'local') ||
        trainType === 'rapid' ||
        trainType === 'ltdexp'
      ) {
        return 8;
      }
    }
    if (trainTypeName?.length === 2 && isTY) {
      return 8;
    }
    return 0;
  }, [headerLangState, isTY, trainType, trainTypeName?.length]);
  const prevLetterSpacing = useValueRef(letterSpacing).current;

  const paddingLeft = useMemo((): number => {
    if (Platform.OS === 'android') {
      return 0;
    }
    if (!headerLangState || trainTypeName?.length === 2) {
      if (
        (isTY && trainType === 'local') ||
        trainType === 'rapid' ||
        trainType === 'ltdexp'
      ) {
        return 8;
      }
    }
    if (trainTypeName?.length === 2 && isTY) {
      return 8;
    }
    return 0;
  }, [headerLangState, isTY, trainType, trainTypeName?.length]);
  const prevPaddingLeft = useValueRef(paddingLeft).current;

  const prevTextIsDifferent = prevTrainTypeText !== trainTypeText;

  useEffect(() => {
    if (prevTextIsDifferent) {
      textOpacityAnim.setValue(1);
    }
  }, [headerState, prevTextIsDifferent, textOpacityAnim]);

  useEffect(() => {
    if (prevTextIsDifferent || headerState.endsWith('_EN')) {
      timing(textOpacityAnim, {
        toValue: 0,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
        easing: Easing.ease,
      }).start();
    }
  }, [headerState, prevTextIsDifferent, textOpacityAnim]);

  const textTopAnimatedStyles = {
    opacity: sub(1, textOpacityAnim),
  };

  const textBottomAnimatedStyles = {
    opacity: textOpacityAnim,
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#aaa', '#000', '#000', '#aaa']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={styles.gradient}
      />
      <LinearGradient
        colors={[`${trainTypeColor}ee`, `${trainTypeColor}aa`]}
        style={styles.gradient}
      />

      <View style={styles.textWrapper}>
        <Animated.Text
          style={[
            textTopAnimatedStyles,
            {
              ...styles.text,
              fontSize: RFValue(fontSize),
              lineHeight: RFValue(
                Platform.OS === 'ios' ? fontSize : fontSize + 4
              ),
              paddingLeft,
              letterSpacing,
            },
          ]}
        >
          {trainTypeText}
        </Animated.Text>
        <Animated.Text
          style={[
            textBottomAnimatedStyles,
            {
              ...styles.text,
              fontSize: RFValue(prevFontSize),
              lineHeight: RFValue(
                Platform.OS === 'ios' ? prevFontSize : prevFontSize + 4
              ),
              paddingLeft: prevPaddingLeft,
              letterSpacing: prevLetterSpacing,
            },
          ]}
        >
          {prevTrainTypeText}
        </Animated.Text>
      </View>
    </View>
  );
};

TrainTypeBox.defaultProps = {
  isTY: false,
};

export default React.memo(TrainTypeBox);

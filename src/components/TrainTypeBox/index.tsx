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

type Props = {
  trainType: APITrainType | TrainType;
  isMetro?: boolean;
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

const TrainTypeBox: React.FC<Props> = ({ trainType, isMetro }: Props) => {
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

  const trainTypeTextEastJa = useMemo(() => {
    return isMetro ? translate('local') : translate('dtLocal');
  }, [isMetro]);
  const trainTypeTextEastEn = useMemo(() => {
    return isMetro ? translate('localEn') : translate('dtLocalEn');
  }, [isMetro]);

  const trainTypeName = (
    (trainType as APITrainType).name || trainTypeTextEastJa
  )?.replace(parenthesisRegexp, '');
  const trainTypeNameR = (
    (trainType as APITrainType).nameR || trainTypeTextEastEn
  )?.replace(parenthesisRegexp, '');

  const isJapaneseContains = !!trainTypeName.match(
    /^[\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf]+$/
  );

  const isEn = !isJapaneseContains || headerState.endsWith('_EN');

  const trainTypeText = useMemo(() => {
    switch (trainType) {
      case 'local':
        return isEn ? trainTypeTextEastEn : trainTypeTextEastJa;
      case 'rapid':
        return translate(isEn ? 'rapidEn' : 'rapid');
      case 'ltdexp':
        return translate(isEn ? 'ltdExpEn' : 'ltdExp');
      default:
        if (typeof trainType === 'string') {
          return '';
        }
        return isEn ? trainTypeNameR : trainTypeName;
    }
  }, [
    isEn,
    trainType,
    trainTypeName,
    trainTypeNameR,
    trainTypeTextEastEn,
    trainTypeTextEastJa,
  ]);

  const prevTrainTypeText = useValueRef(trainTypeText).current;

  const fontSize = useMemo((): number => {
    if (isPad) {
      if (isMetro && !isEn && trainType !== 'ltdexp' && !trainTypeName) {
        return 21;
      }
      if (!isEn && trainTypeName?.length <= 4) {
        return 38;
      }
      if (!isEn && trainTypeName?.length === 5) {
        return 32;
      }
      if (!isEn && trainTypeName?.length >= 6) {
        return 18;
      }
      if (isEn && (trainType === 'ltdexp' || trainTypeNameR?.length > 10)) {
        return 14;
      }
      return 18;
    }
    if (isMetro && !isEn && trainType !== 'ltdexp' && !trainTypeName) {
      return 21;
    }
    if (!isEn && trainTypeName?.length <= 5) {
      return 18;
    }
    if (isEn && (trainType === 'ltdexp' || trainTypeNameR?.length > 10)) {
      return 11;
    }
    if (isEn && (trainType === 'ltdexp' || trainTypeNameR?.length >= 5)) {
      return 18;
    }
    return 14;
  }, [isEn, isMetro, trainType, trainTypeName, trainTypeNameR]);
  const prevFontSize = useValueRef(fontSize).current;

  const letterSpacing = useMemo((): number => {
    if (!isEn) {
      if (
        (!isMetro && trainType === 'local') ||
        trainType === 'rapid' ||
        trainType === 'ltdexp' ||
        trainTypeName?.length === 2
      ) {
        return 8;
      }
    }
    return 0;
  }, [isEn, isMetro, trainType, trainTypeName]);
  const prevLetterSpacing = useValueRef(letterSpacing).current;

  const paddingLeft = useMemo((): number => {
    if (Platform.OS === 'android') {
      return 0;
    }
    if (!isEn) {
      if (
        (!isMetro && trainType === 'local') ||
        trainType === 'rapid' ||
        trainType === 'ltdexp' ||
        trainTypeName?.length === 2
      ) {
        return 8;
      }
    }
    return 0;
  }, [isEn, isMetro, trainType, trainTypeName]);
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
  isMetro: false,
};

export default React.memo(TrainTypeBox);

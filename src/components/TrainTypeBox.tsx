import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
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
import useAppState from '../hooks/useAppState';
import useConnectedLines from '../hooks/useConnectedLines';
import useCurrentLine from '../hooks/useCurrentLine';
import useValueRef from '../hooks/useValueRef';
import { HeaderLangState } from '../models/HeaderTransitionState';
import { APITrainType, APITrainTypeMinimum } from '../models/StationAPI';
import { APP_THEME } from '../models/Theme';
import { TrainType } from '../models/TrainType';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import tuningState from '../store/atoms/tuning';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import normalizeFontSize from '../utils/normalizeFontSize';

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
    position: 'absolute',
  },
  textWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextTrainType: {
    fontWeight: 'bold',
    fontSize: normalizeFontSize(5),
    marginTop: 4,
    position: 'absolute',
    top: isTablet ? 55 : 30.25,
    width: Dimensions.get('window').width,
  },
});

const TrainTypeBox: React.FC<Props> = ({ trainType, isTY }: Props) => {
  const { headerState, trainType: trainTypeRaw } =
    useRecoilValue(navigationState);
  const { selectedDirection } = useRecoilValue(stationState);
  const { theme } = useRecoilValue(themeState);
  const { headerTransitionDelay } = useRecoilValue(tuningState);
  const textOpacityAnim = useValue<0 | 1>(0);

  const appState = useAppState();

  const typedTrainType = trainTypeRaw as APITrainType;

  const currentLine = useCurrentLine();
  const connectedLines = useConnectedLines();
  const nextLine = connectedLines[0];

  const nextTrainType = useMemo((): APITrainTypeMinimum | null => {
    if (!typedTrainType || !currentLine) {
      return null;
    }

    const currentTrainTypeIndex = typedTrainType?.allTrainTypes?.findIndex(
      (tt) => tt.line.id === currentLine?.id
    );
    if (selectedDirection === 'INBOUND') {
      return typedTrainType.allTrainTypes[currentTrainTypeIndex + 1];
    }
    return typedTrainType.allTrainTypes[currentTrainTypeIndex - 1];
  }, [currentLine, selectedDirection, typedTrainType]);

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

  const fontSize = useMemo((): number => {
    if (
      (trainTypeText && trainTypeText.length > 6) ||
      trainTypeText?.includes('\n')
    ) {
      return normalizeFontSize(6);
    }
    return normalizeFontSize(7);
  }, [trainTypeText]);

  const prevFontSize = useValueRef(fontSize).current;

  const letterSpacing = useMemo((): number => {
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
  const prevLetterSpacing = useValueRef(letterSpacing).current;

  const paddingLeft = useMemo((): number => {
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
  const prevPaddingLeft = useValueRef(paddingLeft).current;

  const prevTextIsDifferent = prevTrainTypeText !== trainTypeText;

  useEffect(() => {
    if (prevTextIsDifferent) {
      textOpacityAnim.setValue(1);
    }
  }, [headerState, prevTextIsDifferent, textOpacityAnim]);

  useEffect(() => {
    if (appState !== 'active') {
      return;
    }

    if (prevTextIsDifferent || headerState.endsWith('_EN')) {
      timing(textOpacityAnim, {
        toValue: 0,
        duration: headerTransitionDelay,
        easing: EasingNode.ease,
      }).start();
    }
  }, [
    appState,
    headerState,
    headerTransitionDelay,
    prevTextIsDifferent,
    textOpacityAnim,
  ]);

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

        <View style={styles.textWrapper}>
          <Animated.Text
            style={[
              textTopAnimatedStyles,
              {
                ...styles.text,
                fontSize,
                lineHeight: Platform.OS === 'ios' ? fontSize : fontSize + 2,
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
                fontSize: prevFontSize,
                lineHeight:
                  Platform.OS === 'ios' ? prevFontSize : prevFontSize + 2,
                paddingLeft: prevPaddingLeft,
                letterSpacing: prevLetterSpacing,
              },
            ]}
          >
            {prevTrainTypeText}
          </Animated.Text>
        </View>
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

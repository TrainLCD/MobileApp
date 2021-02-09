import React, { useMemo } from 'react';
import {
  Platform,
  PlatformIOSStatic,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRecoilValue } from 'recoil';
import { translate } from '../../translation';
import { TrainType } from '../../models/TrainType';
import navigationState from '../../store/atoms/navigation';

type Props = {
  trainType: TrainType;
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
  },
});

const TrainTypeBox: React.FC<Props> = ({ trainType, isMetro }: Props) => {
  const { headerState } = useRecoilValue(navigationState);
  const isEn = headerState.endsWith('_EN');

  const trainTypeColor = useMemo(() => {
    switch (trainType) {
      case 'local':
        return '#1f63c6';
      case 'rapid':
        return '#dc143c';
      case 'ltdexp':
        return '#fd5a2a';
      default:
        return '';
    }
  }, [trainType]);

  const trainTypeTextEastJa = useMemo(() => {
    return isMetro ? 'local' : 'dtLocal';
  }, [isMetro]);
  const trainTypeTextEastEn = useMemo(() => {
    return isMetro ? 'localEn' : 'dtLocalEn';
  }, [isMetro]);

  const trainTypeText = useMemo(() => {
    switch (trainType) {
      case 'local':
        return translate(isEn ? trainTypeTextEastEn : trainTypeTextEastJa);
      case 'rapid':
        return translate(isEn ? 'rapidEn' : 'rapid');
      case 'ltdexp':
        return translate(isEn ? 'ltdExpEn' : 'ltdExp');
      default:
        return '';
    }
  }, [isEn, trainType, trainTypeTextEastEn, trainTypeTextEastJa]);

  const fontSize = useMemo((): number => {
    if (isPad) {
      if (isEn && trainType === 'ltdexp') {
        return 28;
      }
      return 38;
    }
    if (isMetro && !isEn && trainType !== 'ltdexp') {
      return 21;
    }
    if (isEn && trainType === 'ltdexp') {
      return 14;
    }
    return 24;
  }, [isEn, isMetro, trainType]);
  const letterSpacing = useMemo((): number => {
    if (!isEn && !isMetro) {
      return 8;
    }
    if (!isEn && (trainType === 'rapid' || trainType === 'ltdexp')) {
      return 8;
    }
    return 0;
  }, [isEn, isMetro, trainType]);
  const marginLeft = useMemo((): number => {
    if (Platform.OS === 'android') {
      return 0;
    }
    if (!isEn && !isMetro) {
      return 8;
    }
    if (!isEn && (trainType === 'rapid' || trainType === 'ltdexp')) {
      return 8;
    }
    return 0;
  }, [isEn, isMetro, trainType]);

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

      <Text
        style={{
          ...styles.text,
          fontSize,
          marginLeft,
          letterSpacing,
        }}
      >
        {trainTypeText}
      </Text>
    </View>
  );
};

TrainTypeBox.defaultProps = {
  isMetro: false,
};

export default React.memo(TrainTypeBox);

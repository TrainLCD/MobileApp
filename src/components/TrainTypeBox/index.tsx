import React, { useMemo } from 'react';
import {
  Platform,
  PlatformIOSStatic,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { isJapanese, translate } from '../../translation';
import { TrainType } from '../../models/TrainType';

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
  const trainTypeText = useMemo(() => {
    switch (trainType) {
      case 'local':
        return translate(isMetro ? 'local' : 'dtLocal');
      case 'rapid':
        return translate('rapid');
      case 'ltdexp':
        return translate('ltdExp');
      default:
        return '';
    }
  }, [isMetro, trainType]);

  const fontSize = useMemo((): number => {
    if (isPad) {
      if (!isJapanese && trainType === 'ltdexp') {
        return 28;
      }
      return 38;
    }
    if (isMetro && isJapanese && trainType !== 'ltdexp') {
      return 21;
    }
    if (!isJapanese && trainType === 'ltdexp') {
      return 14;
    }
    return 24;
  }, [isMetro, trainType]);
  const letterSpacing = useMemo((): number => {
    if (isJapanese && !isMetro) {
      return 8;
    }
    if (isJapanese && (trainType === 'rapid' || trainType === 'ltdexp')) {
      return 8;
    }
    return 0;
  }, [isMetro, trainType]);

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

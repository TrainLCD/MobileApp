import React from 'react';
import { Platform, PlatformIOSStatic, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { isJapanese, translate } from '../../translation';

type Props = {
  trainType: 'local' | 'rapid';
};

const { isPad } = Platform as PlatformIOSStatic;

const styles = StyleSheet.create({
  root: {
    width: isPad ? 175 : 96.25,
    height: isPad ? 55 : 30.25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    borderRadius: 4,
  },
  text: {
    width: isPad ? 175 : 96.25,
    height: isPad ? 55 : 30.25,
    lineHeight: isPad ? 55 : 30.25,
    position: 'absolute',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: isPad ? 38 : 24,
    shadowOpacity: 0.25,
    shadowColor: '#000',
    shadowRadius: 1,
    elevation: 5,
  },
});

const DTTrainType: React.FC<Props> = ({ trainType }: Props) => {
  const trainTypeColor = trainType === 'local' ? '#1f63c6' : '#dc143c';
  const trainTypeText =
    trainType === 'local' ? translate('dtLocal') : translate('dtRapid');

  return (
    <>
      <LinearGradient
        colors={['#aaa', '#000', '#000', '#aaa']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={styles.root}
      />
      <LinearGradient
        colors={[`${trainTypeColor}ee`, `${trainTypeColor}aa`]}
        style={styles.root}
      />

      <Text
        style={{
          ...styles.text,
          marginLeft: isJapanese ? 4 : 0,
          letterSpacing: isJapanese ? 8 : 0,
        }}
      >
        {trainTypeText}
      </Text>
    </>
  );
};

export default React.memo(DTTrainType);

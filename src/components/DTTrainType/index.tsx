import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { isJapanese, translate } from '../../translation';

type Props = {
  trainType: 'local' | 'rapid';
};

const styles = StyleSheet.create({
  root: {
    width: 96.25,
    height: 30.25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    borderRadius: 4,
  },
  text: {
    width: 96.25,
    height: 30.25,
    lineHeight: 30.25,
    position: 'absolute',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 24,
    shadowOpacity: 1,
    shadowColor: '#000',
    textShadowRadius: 1,
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
          letterSpacing: isJapanese ? 8 : 0,
        }}
      >
        {trainTypeText}
      </Text>
    </>
  );
};

export default React.memo(DTTrainType);

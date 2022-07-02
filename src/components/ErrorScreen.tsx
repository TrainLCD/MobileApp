import React, { useCallback } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRecoilValue } from 'recoil';
import devState from '../store/atoms/dev';
import { translate } from '../translation';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fcfcfc',
  },
  text: {
    fontSize: RFValue(16),
    color: '#333',
    textAlign: 'center',
    lineHeight: RFValue(21),
    marginBottom: 4,
    paddingHorizontal: 32,
  },
  reasonText: {
    fontSize: RFValue(12),
    color: '#333',
    textAlign: 'center',
    lineHeight: RFValue(21),
    marginBottom: 4,
    paddingHorizontal: 32,
    fontWeight: 'bold',
  },
  headingText: {
    color: '#03a9f4',
    fontSize: RFValue(24),
    lineHeight: undefined,
    fontWeight: 'bold',
    paddingHorizontal: 32,
  },
  buttons: { flexDirection: 'row' },
  button: {
    borderRadius: 4,
    backgroundColor: '#03a9f4',
    padding: 12,
    marginTop: 24,
    marginHorizontal: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: RFValue(16),
    textAlign: 'center',
    lineHeight: RFValue(21),
    fontWeight: 'bold',
  },
});

type Props = {
  title: string;
  text: string;
  reason?: string;
  stacktrace?: string;
  onRetryPress?: () => void;
  onRecoverErrorPress?: () => void;
  onConnectMSPress?: () => void;
  recoverable?: boolean; // trueのときは駅指定ができるようになる
};

const ErrorScreen: React.FC<Props> = ({
  title,
  text,
  reason,
  stacktrace,
  onRetryPress,
  recoverable,
  onRecoverErrorPress,
  onConnectMSPress,
}: Props) => {
  const { devMode } = useRecoilValue(devState);

  const handleStacktracePress = useCallback(() => {
    Alert.alert(translate('stacktrace'), `${reason}${stacktrace}`);
  }, [reason, stacktrace]);

  return (
    <SafeAreaView style={styles.root}>
      <Text style={[styles.text, styles.headingText]}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      {reason ? <Text style={styles.reasonText}>{reason}</Text> : null}

      <View style={styles.buttons}>
        {onRetryPress ? (
          <TouchableOpacity onPress={onRetryPress} style={styles.button}>
            <Text style={styles.buttonText}>{translate('retry')}</Text>
          </TouchableOpacity>
        ) : null}
        {recoverable ? (
          <TouchableOpacity onPress={onRecoverErrorPress} style={styles.button}>
            <Text style={styles.buttonText}>
              {translate('startStationTitle')}
            </Text>
          </TouchableOpacity>
        ) : null}
        {devMode && onConnectMSPress ? (
          <TouchableOpacity onPress={onConnectMSPress} style={styles.button}>
            <Text style={styles.buttonText}>{translate('msConnectTitle')}</Text>
          </TouchableOpacity>
        ) : null}
        {stacktrace ? (
          <TouchableOpacity
            onPress={handleStacktracePress}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{translate('stacktrace')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

ErrorScreen.defaultProps = {
  onRecoverErrorPress: undefined,
  recoverable: false,
  onRetryPress: undefined,
  reason: undefined,
  stacktrace: undefined,
  onConnectMSPress: undefined,
};

export default ErrorScreen;

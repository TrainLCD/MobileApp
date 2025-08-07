// ErrorScreenのnavigationない版
import * as Linking from 'expo-linking';
import type React from 'react';
import { useCallback } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { isDevApp } from '~/utils/isDevApp';
import { STATUS_URL } from '../constants';
import { translate } from '../translation';
import { RFValue } from '../utils/rfValue';

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
    marginBottom: 4,
    paddingHorizontal: 32,
  },
  headingText: {
    color: '#03a9f4',
    fontSize: RFValue(24),
    fontWeight: 'bold',
    paddingHorizontal: 32,
    marginBottom: 16,
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
    fontWeight: 'bold',
  },
});

type Props = {
  title: string;
  text: string;
  onRetryPress?: () => void;
  showStatus?: boolean;
  reason?: string;
  stacktrace?: string;
};

const FatalErrorScreen: React.FC<Props> = ({
  title,
  text,
  onRetryPress,
  showStatus,
  reason,
  stacktrace,
}: Props) => {
  const openStatusPage = useCallback(() => Linking.openURL(STATUS_URL), []);
  const showStacktrace = useCallback(() => {
    if (!isDevApp || !stacktrace) {
      return;
    }

    Alert.alert(translate('stacktrace'), stacktrace, [
      { text: 'OK', style: 'cancel' },
    ]);
  }, [stacktrace]);

  return (
    <SafeAreaView style={styles.root}>
      <Text style={[styles.text, styles.headingText]}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      {reason ? <Text style={styles.text}>{reason}</Text> : null}

      <View style={styles.buttons}>
        {onRetryPress ? (
          <TouchableOpacity onPress={onRetryPress} style={styles.button}>
            <Text style={styles.buttonText}>{translate('retry')}</Text>
          </TouchableOpacity>
        ) : null}
        {showStatus ? (
          <TouchableOpacity onPress={openStatusPage} style={styles.button}>
            <Text style={styles.buttonText}>{translate('openStatusText')}</Text>
          </TouchableOpacity>
        ) : null}
        {stacktrace ? (
          <TouchableOpacity onPress={showStacktrace} style={styles.button}>
            <Text style={styles.buttonText}>{translate('stacktrace')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default FatalErrorScreen;

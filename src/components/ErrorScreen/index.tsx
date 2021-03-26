import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { translate } from '../../translation';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fcfcfc',
    paddingHorizontal: 32,
  },
  text: {
    fontSize: RFValue(16),
    color: '#333',
    textAlign: 'center',
    lineHeight: RFValue(21),
    marginBottom: 12,
  },
  boldText: {
    fontWeight: 'bold',
  },
  headingText: {
    color: '#03a9f4',
    fontSize: RFValue(24),
    lineHeight: undefined,
    fontWeight: 'bold',
  },
  button: {
    borderRadius: 4,
    backgroundColor: '#03a9f4',
    padding: 12,
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    marginBottom: 0,
  },
  linkText: {
    color: '#03a9f4',
    marginBottom: 0,
    lineHeight: RFValue(24),
  },
  link: {
    borderBottomColor: '#03a9f4',
    borderBottomWidth: 1,
  },
});

type Props = {
  title: string;
  text: string;
  onRetryPress: () => void;
};

const ErrorScreen: React.FC<Props> = ({ title, text, onRetryPress }: Props) => (
  <SafeAreaView style={styles.root}>
    <Text style={[styles.text, styles.headingText]}>{title}</Text>
    <Text style={[styles.text]}>{text}</Text>

    <TouchableOpacity onPress={onRetryPress} style={styles.button}>
      <Text style={[styles.text, styles.boldText, styles.buttonText]}>
        {translate('retry')}
      </Text>
    </TouchableOpacity>
  </SafeAreaView>
);

export default ErrorScreen;

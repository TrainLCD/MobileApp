import React from 'react'
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { translate } from '../translation'

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
})

type Props = {
  title: string
  text: string
  onRetryPress?: () => void
  onRecoverErrorPress?: () => void
  recoverable?: boolean // trueのときは駅指定ができるようになる
}

const ErrorScreen: React.FC<Props> = ({
  title,
  text,
  onRetryPress,
  recoverable,
  onRecoverErrorPress,
}: Props) => {
  return (
    <SafeAreaView style={styles.root}>
      <Text style={[styles.text, styles.headingText]}>{title}</Text>
      <Text style={styles.text}>{text}</Text>

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
      </View>
    </SafeAreaView>
  )
}

export default ErrorScreen

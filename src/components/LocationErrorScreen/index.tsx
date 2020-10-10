import React, { useCallback } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useDispatch } from 'react-redux';
import * as Location from 'expo-location';
import { updateLocationSuccess } from '../../store/actions/location';
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
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: 'bold',
  },
  headingText: {
    color: '#03a9f4',
    fontSize: 24,
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
    lineHeight: 24,
  },
  link: {
    borderBottomColor: '#03a9f4',
    borderBottomWidth: 1,
  },
});

const LocationErrorScreen: React.FC = () => {
  const dispatch = useDispatch();

  const handleRefreshPress = useCallback(async () => {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    dispatch(updateLocationSuccess(loc));
  }, [dispatch]);

  return (
    <SafeAreaView style={styles.root}>
      <Text style={[styles.text, styles.headingText]}>
        {translate('errorTitle')}
      </Text>
      <Text style={[styles.text]}>{translate('couldNotGetLocation')}</Text>

      <TouchableOpacity onPress={handleRefreshPress} style={styles.button}>
        <Text style={[styles.text, styles.boldText, styles.buttonText]}>
          {translate('retry')}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default React.memo(LocationErrorScreen);

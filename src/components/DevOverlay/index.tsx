import { LocationData } from 'expo-location';
import React, { useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { IStation } from '../../models/StationAPI';

interface IProps {
  location: LocationData;
  currentStation: IStation;
  nextStation: IStation;
  gap: number;
}

const DevOverlay = ({ location, currentStation, nextStation, gap }: IProps) => {
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width,
  );

  const onLayout = () => {
    setWindowWidth(Dimensions.get('window').width);
  };

  const styles = StyleSheet.create({
    root: {
      position: 'absolute',
      right: 0,
      top: Platform.OS === 'android' ? 24 : 0,
      width: windowWidth / 3,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 9999,
      padding: 4,
    },
    text: {
      color: 'white',
    }
  });

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Text style={styles.text}>Latitude: {location.coords.latitude}</Text>
      <Text style={styles.text}>Longitude: {location.coords.longitude}</Text>
      <Text style={styles.text}>Accuracy: {location.coords.accuracy}</Text>
      {gap ? <Text style={styles.text}>Gap: {gap}</Text> : null}
      {currentStation ? <Text style={styles.text}>Current: {currentStation.name}</Text> : null}
      {nextStation ? <Text style={styles.text}>Next: {nextStation.name}</Text> : null}
    </View>
  );
};

export default DevOverlay;

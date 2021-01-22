import { LocationObject } from 'expo-location';
import React, { useEffect, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

interface Props {
  location: LocationObject | Pick<LocationObject, 'coords'>;
}

const { width: windowWidth } = Dimensions.get('window');

const DevOverlay: React.FC<Props> = ({ location }: Props) => {
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
    },
  });

  const speedKMH = Math.round((location.coords.speed * 3600) / 1000);
  const { latitude, longitude, accuracy } = location.coords;
  const [address, setAddress] = useState('');

  useEffect(() => {
    const f = async () => {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const { region, city, street } = reverseGeocode[0];
      setAddress(`${region}${city}${street}`);
    };
    f();
  }, [latitude, longitude]);

  return (
    <View style={styles.root}>
      <Text style={styles.text}>{`Latitude: ${latitude}`}</Text>
      <Text style={styles.text}>{`Longitude: ${longitude}`}</Text>
      {accuracy && <Text style={styles.text}>{`Accuracy: ${accuracy}m`}</Text>}
      {speedKMH > 0 ? (
        <Text style={styles.text}>
          Speed:
          {speedKMH}
          km/h
        </Text>
      ) : null}
      <Text style={styles.text}>{`Address: ${address}`}</Text>
    </View>
  );
};

export default DevOverlay;

import { LocationObject } from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import calcHubenyDistance from '../../utils/hubeny';
import { LatLon } from '../../models/LatLon';
import { isJapanese } from '../../translation';

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
  const [prevCoords, setPrevCoords] = useState<LatLon>();

  const updateAddress = useCallback(async () => {
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const { region, city, street } = reverseGeocode[0];
      const arr = [region, city, street || ''];
      setAddress(isJapanese ? arr.join('') : arr.slice().reverse().join(', '));
    } catch (err) {
      console.warn(err);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    // 1km動いたあとに住所を更新する
    if (
      !prevCoords ||
      calcHubenyDistance(prevCoords, { latitude, longitude }) > 1000
    ) {
      updateAddress();
      setPrevCoords({ latitude, longitude });
    }
  }, [latitude, longitude, prevCoords, updateAddress]);

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
      {Platform.OS !== 'web' && (
        <Text style={styles.text}>{`Address: ${address}`}</Text>
      )}
    </View>
  );
};

export default DevOverlay;

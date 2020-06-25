import { LocationData } from 'expo-location';
import React, { useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';

interface Props {
  location: LocationData | Pick<LocationData, 'coords'>;
  gap: number;
}

const DevOverlay: React.FC<Props> = ({ location, gap }: Props) => {
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );

  const onLayout = (): void => {
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
    },
  });

  const speedKMH = Math.round((location.coords.speed * 3600) / 1000);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Text style={styles.text}>{`Latitude: ${location.coords.latitude}`}</Text>
      <Text style={styles.text}>
        {`Longitude: ${location.coords.longitude}`}
      </Text>
      <Text style={styles.text}>
        {`Accuracy: ${location.coords.accuracy}m`}
      </Text>
      {gap ? <Text style={styles.text}>{`Gap: ${gap}m`}</Text> : null}
      {speedKMH > 0 ? (
        <Text style={styles.text}>
          Speed:
          {speedKMH}
          km/h
        </Text>
      ) : null}
    </View>
  );
};

export default DevOverlay;

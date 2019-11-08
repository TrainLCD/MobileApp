import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';

import { ILine, IStation } from '../../models/StationAPI';
import Chevron from '../Chevron';

interface IProps {
  arrived: boolean;
  line: ILine;
  stations: IStation[];
}

const LineBoard = (props: IProps) => {
  const { arrived, stations, line } = props;

  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width,
  );

  const [windowHeight, setWindowHeight] = useState(
    Dimensions.get('window').height,
  );

  const onLayout = () => {
    setWindowWidth(Dimensions.get('window').width);
    setWindowHeight(Dimensions.get('window').height);
  };

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      height: windowHeight,
    },
    bar: {
      position: 'absolute',
      bottom: 32,
      width: windowWidth - 48,
      height: 32,
    },
    barTerminal: {
      left: windowWidth - 48 + 6,
      position: 'absolute',
      width: 0,
      height: 0,
      bottom: 32,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderLeftWidth: 16,
      borderRightWidth: 16,
      borderBottomWidth: 32,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      transform: [{ rotate: '90deg' }],
      margin: 0,
      marginLeft: -6,
      borderWidth: 0,
      borderBottomColor: `#${line.lineColorC}`,
    },
    stationNameWrapper: {
      flexDirection: 'row',
      marginLeft: 32,
      flex: 1,
    },
    stationNameContainer: {
      width: windowWidth / 9,
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      paddingBottom: 84,
    },
    stationName: {
      fontSize: 21,
      fontWeight: 'bold',
      width: 32,
      margin: 0,
      padding: 0,
      textAlign: 'center',
      lineHeight: Platform.OS === 'android' ? 24 : 21,
    },
    lineDot: {
      width: 32,
      height: 24,
      position: 'absolute',
      zIndex: 9999,
      bottom: 36,
      overflow: 'visible',
    },
    chevron: {
      marginLeft: 38,
      width: 32,
      height: 24,
    },
    chevronArrived: {
      marginLeft: 0,
    },
  });

  const renderStationNames = (station: IStation) => (
    station.name.split('').map((c, j) => (
      <Text style={styles.stationName} key={j}>
        {c}
      </Text>
    ))
  );

  const presentStationNameCell = (station: IStation, i: number) => (
    <View
      key={station.name}
      onLayout={onLayout}
      style={styles.stationNameContainer}
    >
      {renderStationNames(station)}
      <LinearGradient colors={['#fdfbfb', '#ebedee']} style={styles.lineDot}>
        <View
          style={[styles.chevron, arrived ? styles.chevronArrived : undefined]}
        >
          {!i ? <Chevron /> : null}
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[`#${line.lineColorC}d2`, `#${line.lineColorC}ff`]}
        style={styles.bar}
      />
      <View style={styles.barTerminal} />
      <View style={styles.stationNameWrapper}>
        {stations.map(presentStationNameCell)}
      </View>
    </View>
  );
};

export default LineBoard;

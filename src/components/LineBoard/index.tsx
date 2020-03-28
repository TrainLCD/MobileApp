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
    stationNameContainerEn: {
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
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
    rotatedStationName: {
      width: 'auto',
      transform: [{ rotate: '-50deg' }],
      marginBottom: 8,
    },
    longStationName : {
      width: 120,
      marginLeft: -20,
    },
    fiveLengthStationName : {
      width: 120,
      marginLeft: -20,
      marginBottom: 20,
    },
    veryLongStationName : {
      width: 120,
      marginLeft: -20,
      marginBottom: 20,
    },
    stationNameEn: {
      fontSize: 18,
      fontWeight: 'bold',
      width: 29,
      margin: 0,
      marginBottom: -4,
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
    stationNameWrapperEn: {
      height: windowHeight / 3,
    },
  });

  const includesLongStatioName = stations.filter(
    (s) => s.name.includes('ー') || s.name.length > 6,
  ).length;

  const renderStationName = (station: IStation) =>
  station.name.split('').map((c, j) => (
    <Text style={styles.stationName} key={j}>
      {c}
    </Text>
  ));

  const applyLongStyle = (name: string) => {
    if (name.length === 5) {
      return styles.fiveLengthStationName;
    }
    if (name.length >= 10) {
      return styles.veryLongStationName;
    }
    if (name.length > 5) {
      return styles.longStationName;
    }
    return null;
  };

  const renderStationNamesWrapper = (station: IStation) => {
    if (includesLongStatioName) {
      return (
        <Text style={[styles.stationName, styles.rotatedStationName, applyLongStyle(station.name)]}>
          {station.name}
        </Text>
      );
    }
    return (
      <View style={styles.stationNameContainerEn}>
        {renderStationName(station)}
      </View>
    );
  };

  const presentStationNameCell = (station: IStation, i: number) => (
    <View
      key={station.name}
      onLayout={onLayout}
      style={styles.stationNameContainer}
    >
      {renderStationNamesWrapper(station)}
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

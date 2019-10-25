import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { ILine, IStation } from '../../models/StationAPI';

interface IProps {
  line: ILine;
  stations: IStation[];
}

const screenWidth = Dimensions.get('screen').width;
const screeHeight = Dimensions.get('screen').height;

const LineBoard = (props: IProps) => {
  const { stations, line } = props;

  const styles = StyleSheet.create({
    root: {
      flex: 1,
    },
    bar: {
      position: 'absolute',
      bottom: 32,
      backgroundColor: `#${line.lineColorC}`,
      width: screenWidth - 48,
      height: 32,
    },
    barTerminal: {
      right: 21,
      position: 'absolute',
      width: 0,
      height: 0,
      bottom: 36,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderLeftWidth: 16,
      borderRightWidth: 16,
      borderBottomWidth: 24,
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
      width: screenWidth / 9,
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      paddingBottom: 84,
    },
    stationName: {
      fontSize: 21,
      fontWeight: 'bold',
      width: 21,
      height: 21,
    },
    lineDot: {
      width: 32,
      height: 24,
      position: 'absolute',
      zIndex: 9999,
      bottom: 36,
    },
  });

  const presentStationNameCell = (station: IStation) => (
    <View key={station.name} style={styles.stationNameContainer}>
      {station.name.split('').map((c, i) => <Text style={styles.stationName} key={i}>{c}</Text>)}
      <LinearGradient colors={['#fdfbfb', '#ebedee']} style={styles.lineDot} />
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[`#${line.lineColorC}d2`, `#${line.lineColorC}ff`]}
        style={styles.bar}
      />
      <LinearGradient
        colors={[`#${line.lineColorC}d2`, `#${line.lineColorC}ff`]}
        style={styles.barTerminal}
      />
            <View style={styles.stationNameWrapper}>{stations.map(presentStationNameCell)}</View>
    </View>
  );
};

export default LineBoard;

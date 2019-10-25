import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { LineDirection } from '../../models/Bound';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { ILine, IStation } from '../../models/StationAPI';

const screenWidth = Dimensions.get('screen').width;

interface IProps {
  state: HeaderTransitionState;
  station: IStation;
  nextStation?: IStation;
  boundStation?: IStation;
  lineDirection?: LineDirection;
  loopLine?: boolean;
  line?: ILine;
}

const Header = (props: IProps) => {
  const { station, nextStation, boundStation, line, state, lineDirection, loopLine} = props;

  const [stateText, setStateText] = useState('ただいま');
  const [stationText, setStationText] = useState(station.name);
  const [boundText, setBoundText] = useState(station.name);

  useEffect(() => {
    if (!line) {
      setBoundText('TrainLCD');
    } else if (loopLine) {
      setBoundText(`${line.name}線 ${lineDirection === 'INBOUND' ? '内回り' : '外回り'}`);
    } else if (boundStation) {
      setBoundText(`${boundStation.name}方面`);
    }

    switch (state) {
      case 'ARRIVING':
        if (nextStation) {
          setStateText('まもなく');
          setStationText(nextStation.name);
        }
        break;
      case 'CURRENT':
        setStateText('ただいま');
        setStationText(station.name);
        break;
      case 'NEXT':
        if (nextStation) {
          setStateText('つぎは');
          setStationText(nextStation.name);
        }
        break;
    }
  }, [state, nextStation, boundStation]);

  const styles = StyleSheet.create({
    gradientRoot: {
      paddingTop: 14,
      paddingRight: 21,
      paddingBottom: 14,
      paddingLeft: 21,
      overflow: 'hidden',
    },
    bottom: {
      height: 72,
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingBottom: 12,
    },
    bound: {
      color: '#555',
      fontWeight: 'bold',
      fontSize: 21,
    },
    state: {
      fontSize: 24,
      height: 24,
      width: screenWidth / 3,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    stationName: {
      width: screenWidth,
      fontSize: 48,
      height: 48,
      marginRight: screenWidth / 6,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    divider: {
      width: screenWidth,
      backgroundColor: line ? `#${line.lineColorC}` : '#b5b5ac',
      height: 4,
    },
  });

  return (
    <View>
      <LinearGradient colors={['#fdfbfb', '#ebedee']} style={styles.gradientRoot}>
        <View>
          <Text style={styles.bound}>{boundText}</Text>
        </View>
        <View style={styles.bottom}>
          <Text style={styles.state}>{stateText}</Text>
          <Text style={styles.stationName}>{stationText}</Text>
        </View>
      </LinearGradient>
      <View style={styles.divider} />
    </View>
  );
};

export default Header;

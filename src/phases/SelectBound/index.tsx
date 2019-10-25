import React from 'react';
import { GestureResponderEvent, StyleSheet, Text, View } from 'react-native';

import Button from '../../components/Button';
import { directionToDirectionName, LineDirection } from '../../models/Bound';
import { IStation } from '../../models/StationAPI';

interface IProps {
  inboundStation: IStation;
  outboundStation: IStation;
  loopLine: boolean;
  onBoundSelected: (station: IStation, direction: LineDirection) => void;
  onBackButtonPress: (event: GestureResponderEvent) => void;
}

const styles = StyleSheet.create({
  bottom: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
  },
  headingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  buttons: {
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    marginLeft: 8,
    marginRight: 8,
  },
  horizonalButtons: {
    flexDirection: 'row',
    marginBottom: 12,
  },
});

const SelectBound = (props: IProps) => {
  const { inboundStation, outboundStation, onBoundSelected, loopLine, onBackButtonPress } = props;

  const handleBoundSelectedPreess = (station: IStation, direction: LineDirection) =>
    onBoundSelected(station, direction);
  const handleBackButtonPress = (event: GestureResponderEvent) => onBackButtonPress(event);

  const renderButton = (station: IStation, direction: LineDirection) => {
    const directionName = directionToDirectionName(direction);
    return (
      <Button
        style={styles.button}
        text={loopLine ? `${directionName}(${station.name}方面)` : `${station.name}方面`}
        color='#333'
        key={station.groupId}
        onPress={handleBoundSelectedPreess.bind(this, station, direction)}
      />
    );
  };

  return (
      <View style={styles.bottom}>
        <Text style={styles.headingText}>方面を選択してください</Text>

        <View style={styles.buttons}>
          <View style={styles.horizonalButtons}>
            {renderButton(inboundStation, 'INBOUND')}
            {renderButton(outboundStation, 'OUTBOUND')}
          </View>
          <Button
            text='戻る'
            color='#333'
            onPress={handleBackButtonPress}
          />
        </View>
      </View>
  );
};

export default SelectBound;

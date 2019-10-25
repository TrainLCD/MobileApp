import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Button from '../../components/Button';
import { ILine, IStation } from '../../models/StationAPI';

interface IProps {
  nearestStation: IStation;
  onLineSelected: (line: ILine) => void;
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
  },
});

const SelectLine = (props: IProps) => {
  const { nearestStation, onLineSelected } = props;

  const onLineButtonPress = (line: ILine) =>
    onLineSelected(line);

  const renderLineButton = (line: ILine) => (
    <Button
      text={line.name}
      color={`#${line.lineColorC}`}
      key={line.id}
      onPress={onLineButtonPress.bind(this, line)}
    />
  );

  return (
      <View style={styles.bottom}>
        <Text style={styles.headingText}>路線を選択してください</Text>

        <View style={styles.buttons}>
          {nearestStation.lines.map((line) => renderLineButton(line))}
        </View>
      </View>
  );
};

export default SelectLine;

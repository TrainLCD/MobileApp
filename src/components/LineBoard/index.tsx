import React from 'react';
import { Text, View } from 'react-native';

import { IStation } from '../../models/StationAPI';

interface IProps {
  stations: IStation[];
}

const LineBoard = (props: IProps) => {
  const { stations } = props;
  return (
    <View>
      {stations.map((s) => <Text key={s.name}>{s.name}</Text>)}
    </View>
  );
};

export default LineBoard;

import React, { useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { isIPad } from '../../helpers/ipad';
import { omitJRLinesIfThresholdExceeded } from '../../helpers/jr';
import { getLineMark } from '../../lineMark';
import { ILine, IStation } from '../../models/StationAPI';
import TransferLineDot from '../TransferLineDot';
import TransferLineMark from '../TransferLineMark';

interface IProps {
  stations: IStation[];
  currentLine: ILine;
}

const renderLineMark = (line: ILine) => {
  const styles = StyleSheet.create({
    stationCell: {
      marginBottom: 8,
      marginRight: 8,
    },
  });

  const mark = getLineMark(line);
  if (mark) {
    return (
      <View style={styles.stationCell}>
        <TransferLineMark line={line} mark={mark} small={true} />
      </View>
    );
  }
  return (
    <View style={styles.stationCell} key={line.id}>
      <TransferLineDot line={line} small={true} />
    </View>
    );
};

const presentTransferInfo = (station: IStation, currentLine: ILine) => {
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width,
  );
  const styles = StyleSheet.create({
    station: {
      width: windowWidth / 8.5,
      flexWrap: 'wrap',
      marginTop: 8,
    },
  });

  const onLayout = () => {
    setWindowWidth(Dimensions.get('window').width);
  };

  const currentLineExcluded = station.lines.filter((line) => line.id !== currentLine.id);
  const omittedLines = omitJRLinesIfThresholdExceeded(currentLineExcluded);

  return (
    <View onLayout={onLayout} style={styles.station}>
      {omittedLines.map(renderLineMark)}
    </View>
  );
};

const TransfersForIPad = ({
  stations,
  currentLine,
}: IProps) => {
  if (!isIPad) {
    return null;
  }

  const styles = StyleSheet.create({
    root: {
      position: 'absolute',
      top: Dimensions.get('window').height / 2.75,
      flexDirection: 'row',
      marginLeft: 32,
    },
  });

  return (
    <View style={styles.root}>
      {stations.map((station) => presentTransferInfo(station, currentLine))}
    </View>
  );
};

export default TransfersForIPad;

import React from 'react';
import { StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import { LineMark } from '../lineMark';
import { Line } from '../models/StationAPI';
import NumberingIcon from './NumberingIcon';

interface Props {
  line: Line | null | undefined;
  mark: LineMark;
  small?: boolean;
  shouldGrayscale?: boolean;
}

const TransferLineMark: React.FC<Props> = ({
  line,
  mark,
  small,

  shouldGrayscale,
}: Props) => {
  const styles = StyleSheet.create({
    lineMarkImage: {
      width: small ? 25.6 : 38,
      height: small ? 25.6 : 38,
      marginRight: 4,
      opacity: shouldGrayscale ? 0.5 : 1,
    },
    signPathWrapper: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    numberingIconContainer: { marginRight: 4 },
  });

  if (mark.signPath && mark.subSignPath) {
    return (
      <View style={styles.signPathWrapper}>
        <FastImage style={styles.lineMarkImage} source={mark.signPath} />
        <FastImage style={styles.lineMarkImage} source={mark.subSignPath} />
      </View>
    );
  }
  if (mark.signPath) {
    return <FastImage style={styles.lineMarkImage} source={mark.signPath} />;
  }
  return (
    <View style={styles.numberingIconContainer}>
      <NumberingIcon
        shape={mark.shape}
        lineColor={`#${line?.lineColorC}`}
        stationNumber={`${mark.sign}-00`}
        small
      />
    </View>
  );
};

TransferLineMark.defaultProps = {
  small: undefined,
  shouldGrayscale: false,
};

export default TransferLineMark;

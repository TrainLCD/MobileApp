import { grayscale } from 'polished';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import { MarkShape, NumberingIconSize } from '../constants/numbering';
import { LineMark } from '../lineMark';
import { Line } from '../models/StationAPI';
import NumberingIcon from './NumberingIcon';

interface Props {
  line: Line | null | undefined;
  mark: LineMark;
  size?: NumberingIconSize;
  shouldGrayscale?: boolean;
}

const TransferLineMark: React.FC<Props> = ({
  line,
  mark,
  size,
  shouldGrayscale,
}: Props) => {
  const styles = StyleSheet.create({
    lineMarkImage: {
      width: size === 'tiny' ? 25.6 : 38,
      height: size === 'tiny' ? 25.6 : 38,
      marginRight: 4,
      opacity: shouldGrayscale ? 0.5 : 1,
    },
    signPathWrapper: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    numberingIconContainer: {
      marginRight: 4,
      opacity: shouldGrayscale ? 0.5 : 1,
    },
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

  const fadedLineColor = grayscale(`#${line?.lineColorC || 'ccc'}`);

  return (
    <View style={styles.numberingIconContainer}>
      <NumberingIcon
        shape={mark.shape}
        lineColor={shouldGrayscale ? fadedLineColor : `#${line?.lineColorC}`}
        stationNumber={`${
          mark.shape === MarkShape.jrUnion ? 'JR' : mark.sign || ''
        }-00`}
        size={size}
      />
    </View>
  );
};

TransferLineMark.defaultProps = {
  size: 'default',
  shouldGrayscale: false,
};

export default TransferLineMark;

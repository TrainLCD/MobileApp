import { grayscale } from 'polished';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Line } from '../models/StationAPI';

interface Props {
  line: Line;
  small?: boolean;
  shouldGrayscale?: boolean;
}

const TransferLineDot: React.FC<Props> = ({
  line,
  small,
  shouldGrayscale,
}: Props) => {
  const styles = StyleSheet.create({
    lineDot: {
      width: small ? 20 : 38,
      height: small ? 20 : 38,
      borderRadius: 1,
      marginRight: 4,
      opacity: shouldGrayscale ? 0.5 : 1,
    },
  });

  const fadedLineColor = grayscale(`#${line?.lineColorC || 'ccc'}`);

  return (
    <View
      style={[
        styles.lineDot,
        {
          backgroundColor: !shouldGrayscale
            ? `#${line.lineColorC}`
            : fadedLineColor,
        },
      ]}
    />
  );
};

TransferLineDot.defaultProps = {
  small: false,
  shouldGrayscale: false,
};

export default TransferLineDot;

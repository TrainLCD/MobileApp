import { grayscale } from 'polished';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Line } from '~/@types/graphql';

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
  const styles = useMemo(
    () =>
      StyleSheet.create({
        lineDot: {
          width: small ? 20 : 20 * 1.5,
          height: small ? 20 : 20 * 1.5,
          borderRadius: 1,
          marginRight: 4,
          opacity: shouldGrayscale ? 0.5 : 1,
        },
      }),
    [shouldGrayscale, small]
  );

  const fadedLineColor = useMemo(
    () => grayscale(line?.color ?? '#ccc'),
    [line?.color]
  );

  return (
    <View
      style={[
        styles.lineDot,
        {
          backgroundColor: !shouldGrayscale
            ? (line.color ?? '#000')
            : fadedLineColor,
        },
      ]}
    />
  );
};

export default React.memo(TransferLineDot);

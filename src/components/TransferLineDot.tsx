import { grayscale } from 'polished';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Line } from '~/@types/graphql';
import isTablet from '~/utils/isTablet';

interface Props {
  line: Line;
  small?: boolean;
  shouldGrayscale?: boolean;
}

const DOT_SIZE_DEFAULT = isTablet ? 35 * 1.5 : 35;
const DOT_SIZE_SMALL = 20;

const TransferLineDot: React.FC<Props> = ({
  line,
  small,
  shouldGrayscale,
}: Props) => {
  const dotSize = small ? DOT_SIZE_SMALL : DOT_SIZE_DEFAULT;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        lineDot: {
          width: dotSize,
          height: dotSize,
          borderRadius: 1,
          marginRight: 4,
          opacity: shouldGrayscale ? 0.5 : 1,
        },
      }),
    [shouldGrayscale, dotSize]
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

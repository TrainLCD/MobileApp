import { Image } from 'expo-image';
import { grayscale } from 'polished';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  MARK_SHAPE,
  NUMBERING_ICON_SIZE,
  NumberingIconSize,
} from '../constants/numbering';
import { LineMark } from '../models/LineMark';
import { Line } from '../models/StationAPI';
import isTablet from '../utils/isTablet';
import NumberingIcon from './NumberingIcon';

interface Props {
  line: Line | null | undefined;
  mark: LineMark;
  size?: NumberingIconSize;
  shouldGrayscale?: boolean;
  color?: string;
}

const styles = StyleSheet.create({
  lineMarkImageOrigin: {
    marginRight: 4,
  },
  signPathWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  numberingIconContainerOrigin: {
    marginRight: 4,
  },
});

const TransferLineMark: React.FC<Props> = ({
  line,
  mark,
  size,
  shouldGrayscale,
  color,
}: Props) => {
  const notTinyImageSize = useMemo(() => (isTablet ? 35 * 1.5 : 35), []);
  const lineMarkImageStyle = useMemo(
    () => ({
      ...styles.lineMarkImageOrigin,
      width: size === NUMBERING_ICON_SIZE.TINY ? 20 : notTinyImageSize,
      height: size === NUMBERING_ICON_SIZE.TINY ? 20 : notTinyImageSize,
      opacity: shouldGrayscale ? 0.5 : 1,
    }),
    [notTinyImageSize, shouldGrayscale, size]
  );
  const numberingIconContainerStyle = useMemo(
    () => ({
      ...styles.numberingIconContainerOrigin,
      opacity: shouldGrayscale ? 0.5 : 1,
    }),
    [shouldGrayscale]
  );

  const fadedLineColor = useMemo(
    () => grayscale(color || `#${line?.lineColorC || 'ccc'}`),
    [color, line?.lineColorC]
  );

  if (mark.btUnionSignPaths) {
    return (
      <View style={styles.signPathWrapper}>
        <Image
          style={lineMarkImageStyle}
          source={mark.btUnionSignPaths[0]}
          cachePolicy="memory"
        />
      </View>
    );
  }

  if (mark.signPath && mark.subSignPath) {
    return (
      <View style={styles.signPathWrapper}>
        <Image
          style={lineMarkImageStyle}
          source={mark.signPath}
          cachePolicy="memory"
        />
        <Image
          style={lineMarkImageStyle}
          source={mark.subSignPath}
          cachePolicy="memory"
        />
      </View>
    );
  }

  if (mark.signPath) {
    return (
      <Image
        style={lineMarkImageStyle}
        source={mark.signPath}
        cachePolicy="memory"
      />
    );
  }

  return (
    <View style={numberingIconContainerStyle}>
      {mark.signShape && (
        <NumberingIcon
          shape={mark.signShape}
          lineColor={
            shouldGrayscale ? fadedLineColor : color || `#${line?.lineColorC}`
          }
          stationNumber={`${
            mark.signShape === MARK_SHAPE.JR_UNION ? 'JR' : mark.sign || ''
          }-00`}
          size={size}
        />
      )}
    </View>
  );
};

TransferLineMark.defaultProps = {
  size: NUMBERING_ICON_SIZE.DEFAULT,
  shouldGrayscale: false,
  color: undefined,
};

export default React.memo(TransferLineMark);

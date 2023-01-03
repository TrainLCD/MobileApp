import { grayscale } from 'polished';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import {
  MARK_SHAPE,
  NumberingIconSize,
  NUMBERING_ICON_SIZE,
} from '../constants/numbering';
import { LineMark } from '../lineMark';
import { Line } from '../models/StationAPI';
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
  const lineMariImageStyle = useMemo(
    () => ({
      ...styles.lineMarkImageOrigin,
      width: size === NUMBERING_ICON_SIZE.TINY ? 20 : 38,
      height: size === NUMBERING_ICON_SIZE.TINY ? 20 : 38,
      opacity: shouldGrayscale ? 0.5 : 1,
    }),
    [shouldGrayscale, size]
  );
  const numberingIvonContainerStyle = useMemo(
    () => ({
      ...styles.numberingIconContainerOrigin,
      opacity: shouldGrayscale ? 0.5 : 1,
    }),
    [shouldGrayscale]
  );

  if (mark.btUnionSignPaths) {
    return (
      <View style={styles.signPathWrapper}>
        <FastImage
          style={lineMariImageStyle}
          source={mark.btUnionSignPaths[0]}
        />
      </View>
    );
  }

  if (mark.signPath && mark.subSignPath) {
    return (
      <View style={styles.signPathWrapper}>
        <FastImage style={lineMariImageStyle} source={mark.signPath} />
        <FastImage style={lineMariImageStyle} source={mark.subSignPath} />
      </View>
    );
  }

  if (mark.signPath) {
    return <FastImage style={lineMariImageStyle} source={mark.signPath} />;
  }

  const fadedLineColor = grayscale(color || `#${line?.lineColorC || 'ccc'}`);

  return (
    <View style={numberingIvonContainerStyle}>
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
    </View>
  );
};

TransferLineMark.defaultProps = {
  size: NUMBERING_ICON_SIZE.DEFAULT,
  shouldGrayscale: false,
  color: undefined,
};

export default TransferLineMark;

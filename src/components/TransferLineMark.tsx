import { Image } from 'expo-image';
import { grayscale } from 'polished';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Line } from '~/@types/graphql';
import {
  MARK_SHAPE,
  NUMBERING_ICON_SIZE,
  type NumberingIconSize,
  ROUND_SHAPES,
} from '../constants';
import type { LineMark } from '../models/LineMark';
import isTablet from '../utils/isTablet';
import { isBusLine } from '../utils/line';
import NumberingIcon from './NumberingIcon';

interface Props {
  line: Line | null | undefined;
  mark: LineMark;
  size?: NumberingIconSize;
  shouldGrayscale?: boolean;
  color?: string;
  withDarkTheme?: boolean;
  // 明示的に白いアウトラインを付けるか
  withOutline?: boolean;
  // 角丸の半径を上書き（ラウンド系は自動で円形）
  outlineRadius?: number;
  stationNumber?: string;
  threeLetterCode?: string | null;
}

const styles = StyleSheet.create({
  container: {
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signPathWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  outline: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#fff',
  },
});

const TransferLineMark: React.FC<Props> = ({
  line,
  mark,
  size,
  shouldGrayscale,
  color,
  withDarkTheme,
  withOutline,
  outlineRadius,
  stationNumber,
  threeLetterCode,
}: Props) => {
  const isBus = isBusLine(line);
  const busSymbol = line?.nameShort?.replace(/[０-９]/g, '').at(0) ?? '';

  const notTinyImageSize = useMemo(() => (isTablet ? 35 * 1.5 : 35), []);
  const dim = useMemo(
    () => (size === NUMBERING_ICON_SIZE.SMALL ? 20 : notTinyImageSize),
    [notTinyImageSize, size]
  );

  const isRadiusShape = useMemo(
    () => mark.signShape && ROUND_SHAPES.has(mark.signShape),
    [mark.signShape]
  );
  const imageStyle = useMemo(
    () =>
      withOutline
        ? {
            width: dim - 2,
            height: dim - 2,
            // すでに円形の場合は角丸にしない
            borderRadius: isRadiusShape ? 0 : 5,
          }
        : { width: dim, height: dim },
    [dim, withOutline, isRadiusShape]
  );

  const containerStyle = useMemo(
    () => [
      styles.container,
      { width: dim, height: dim, opacity: shouldGrayscale ? 0.5 : 1 },
    ],
    [dim, shouldGrayscale]
  );

  const numberingIconContainerStyle = useMemo(
    () => ({ opacity: shouldGrayscale ? 0.5 : 1 }),
    [shouldGrayscale]
  );

  const outlineRadiusValue = useMemo(() => {
    if (outlineRadius) {
      return outlineRadius;
    }

    if (mark.signShape || mark.signPath) {
      if (isRadiusShape) {
        return dim / 2;
      }

      // 小田急
      if (mark.signShape === MARK_SHAPE.ODAKYU) {
        return 16;
      }

      // 東武鉄道(11)
      if (line?.company?.id === 11) {
        return 10;
      }

      // JR東日本(2) 相模鉄道(19)
      if (line?.company?.id === 2 || line?.company?.id === 19) {
        return 4;
      }

      // 角丸シンボルの見た目に近い半径のデフォルト
      return 6;
    }

    return 0;
  }, [
    dim,
    mark.signShape,
    mark.signPath,
    outlineRadius,
    line?.company?.id,
    isRadiusShape,
  ]);

  const fadedLineColor = useMemo(
    () => grayscale(color || line?.color || '#ccc'),
    [color, line?.color]
  );

  const outlineStyle = useMemo(
    () => ({
      borderRadius: outlineRadiusValue,
    }),
    [outlineRadiusValue]
  );

  if (mark.btUnionSignPaths && !stationNumber) {
    return (
      <View style={[containerStyle, withOutline ? outlineStyle : null]}>
        {withOutline ? (
          <View pointerEvents="none" style={[styles.outline, outlineStyle]} />
        ) : null}

        <Image
          style={imageStyle}
          source={mark.btUnionSignPaths[0]}
          cachePolicy="memory-disk"
          contentFit="cover"
        />
      </View>
    );
  }

  if (mark.signPath && !stationNumber) {
    return (
      <View style={[containerStyle, withOutline ? outlineStyle : null]}>
        {withOutline ? (
          <View pointerEvents="none" style={[styles.outline, outlineStyle]} />
        ) : null}

        <Image
          style={imageStyle}
          source={mark.signPath}
          cachePolicy="memory-disk"
          contentFit="cover"
        />
      </View>
    );
  }

  return (
    <View style={[containerStyle, numberingIconContainerStyle]}>
      {mark.signShape && (
        <NumberingIcon
          shape={mark.signShape}
          lineColor={
            shouldGrayscale ? fadedLineColor : color || (line?.color ?? '#000')
          }
          stationNumber={
            isBus
              ? busSymbol
              : (stationNumber ??
                `${
                  mark.signShape === MARK_SHAPE.JR_UNION
                    ? 'JR'
                    : mark.sign || ''
                }-00`)
          }
          threeLetterCode={threeLetterCode}
          size={size}
          withDarkTheme={withDarkTheme}
          withOutline={withOutline}
        />
      )}
    </View>
  );
};

export default React.memo(TransferLineMark);

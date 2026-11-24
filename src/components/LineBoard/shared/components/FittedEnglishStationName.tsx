import { useRef, useState } from 'react';
import { type TextProps, View } from 'react-native';
import type { Station } from '~/@types/graphql';
import getStationNameR from '~/utils/getStationNameR';
import Typography from '../../../Typography';
import {
  getHorizontalStationNameWidth,
  HORIZONTAL_STATION_NAME_MAX_CHARS,
  HORIZONTAL_STATION_NAME_ROTATION_DEG,
  commonLineBoardStyles as styles,
} from '../styles/commonStyles';

const angle = (HORIZONTAL_STATION_NAME_ROTATION_DEG * Math.PI) / 180;
const metroWidth = getHorizontalStationNameWidth(
  HORIZONTAL_STATION_NAME_MAX_CHARS
);

const DiagonalLabel = ({
  name,
  available,
  left,
  leftSpace,
  maxWidth,
  band,
  passed,
}: {
  name: string;
  available: number;
  left: number;
  leftSpace: number;
  maxWidth: number;
  band: number;
  passed: boolean;
}) => {
  const initialWidth = Math.min(
    maxWidth,
    Math.max(1, Math.floor(available / Math.sin(angle)))
  );
  const [width, setWidth] = useState(initialWidth);
  const [scale, setScale] = useState(1);
  const search = useRef({
    seen: new Set<number>(),
    best: { width: initialWidth, scale: 0 },
    cursor: Math.floor(maxWidth),
    done: false,
  });
  const onTextLayout: TextProps['onTextLayout'] = ({
    nativeEvent: { lines },
  }) => {
    const state = search.current;
    if (state.done || state.seen.has(width) || !lines.length) return;
    state.seen.add(width);
    const bottom = lines[lines.length - 1].y + lines[lines.length - 1].height;
    // 回転後に最も高くなるのは、各行の右上のうち最も上にある点。
    const height = Math.max(
      ...lines.map(
        (line) =>
          (line.x + line.width) * Math.sin(angle) +
          (bottom - line.y) * Math.cos(angle)
      )
    );
    // The top-left corner of each line travels left around the bottom-left anchor.
    const overhang = Math.max(
      ...lines.map(
        (line) => (bottom - line.y) * Math.sin(angle) - line.x * Math.cos(angle)
      )
    );
    const fit = Math.min(
      1,
      available / height,
      band / bottom,
      overhang > 0 ? leftSpace / overhang : 1
    );
    if (fit === 1) {
      state.done = true;
      return;
    }
    if (fit > state.best.scale) state.best = { width, scale: fit };

    // Try the measured height limit first. Wrapping can change non-monotonically:
    // after a missed estimate, visit every unmeasured integer width.
    if (state.seen.size === 1 && bottom <= band) {
      const estimate = Math.floor(
        Math.min(
          ...lines.map(
            (line) =>
              (available - (bottom - line.y) * Math.cos(angle)) /
                Math.sin(angle) -
              line.x
          )
        )
      );
      if (estimate > 0 && estimate < width) {
        setWidth(estimate);
        return;
      }
    }
    while (state.cursor > 0 && state.seen.has(state.cursor)) state.cursor--;
    if (state.cursor > 0) {
      setWidth(state.cursor);
      return;
    }
    state.done = true;
    setWidth(state.best.width);
    setScale(state.best.scale);
  };
  return (
    <Typography
      key={width}
      onTextLayout={onTextLayout}
      style={[
        styles.stationNameHorizontal,
        styles.englishStationNameSpacing,
        passed && styles.grayColor,
        {
          position: 'absolute',
          bottom: 0,
          left,
          transform: [{ rotate: '-55deg' }, { scale }],
          transformOrigin: 'left bottom',
          width,
        },
      ]}
    >
      {name}
    </Typography>
  );
};

export const FittedEnglishStationName = ({
  station,
  passed,
  bottom,
  left = 16,
  leftSpace = Number.POSITIVE_INFINITY,
  rightSpace,
  pitch,
  baselineOffset = 0,
}: {
  station: Station;
  passed: boolean;
  bottom: number;
  left?: number;
  leftSpace?: number;
  rightSpace?: number;
  pitch: number;
  baselineOffset?: number;
}) => {
  const [height, setHeight] = useState(0);
  const name = getStationNameR(station);
  const maxWidth =
    rightSpace == null
      ? metroWidth
      : Math.max(
          1,
          Math.min(metroWidth, Math.floor(rightSpace / Math.cos(angle)))
        );
  // Perpendicular distance between adjacent anchors, accounting for uneven baselines.
  const band = Math.max(
    1,
    pitch * Math.sin(angle) - baselineOffset * Math.cos(angle)
  );
  return (
    <View
      onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}
      style={{ flex: 1, width: '100%', marginBottom: bottom }}
    >
      {height > 0 && (
        <DiagonalLabel
          key={`${name}-${height}-${maxWidth}-${band}-${leftSpace}`}
          name={name}
          available={height}
          band={band}
          left={left}
          leftSpace={leftSpace}
          maxWidth={maxWidth}
          passed={passed}
        />
      )}
    </View>
  );
};

import { useState } from 'react';
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
  maxWidth,
  passed,
}: {
  name: string;
  available: number;
  left: number;
  maxWidth: number;
  passed: boolean;
}) => {
  const initialWidth = Math.min(
    maxWidth,
    Math.max(1, Math.floor(available / Math.sin(angle)))
  );
  const [width, setWidth] = useState(initialWidth);
  const [best, setBest] = useState({
    width: initialWidth,
    height: Number.POSITIVE_INFINITY,
  });
  const [finished, setFinished] = useState(false);
  const onTextLayout: TextProps['onTextLayout'] = ({
    nativeEvent: { lines },
  }) => {
    if (finished || !lines.length) return;
    const bottom = lines[lines.length - 1].y + lines[lines.length - 1].height;
    // 回転後に最も高くなるのは、各行の右上のうち最も上にある点。
    const height = Math.max(
      ...lines.map(
        (line) =>
          (line.x + line.width) * Math.sin(angle) +
          (bottom - line.y) * Math.cos(angle)
      )
    );
    if (height <= available) return;
    const candidate = height < best.height ? { width, height } : best;
    // 枠から出た行だけが折り返すように幅を詰め、共通の行送りを保って再計測する。
    const next = Math.floor(
      Math.min(
        ...lines.map((line) => {
          const limit =
            (available - (bottom - line.y) * Math.cos(angle)) / Math.sin(angle);
          return line.width > limit ? limit : width;
        })
      )
    );
    if (next <= 0 || next >= width) {
      setFinished(true);
      setWidth(candidate.width);
    } else {
      setBest(candidate);
      setWidth(next);
    }
  };
  return (
    <Typography
      onTextLayout={onTextLayout}
      style={[
        styles.stationNameHorizontal,
        styles.englishStationNameSpacing,
        passed && styles.grayColor,
        {
          position: 'absolute',
          bottom: 0,
          left,
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
  rightSpace,
}: {
  station: Station;
  passed: boolean;
  bottom: number;
  left?: number;
  rightSpace?: number;
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
  return (
    <View
      onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}
      style={{ flex: 1, width: '100%', marginBottom: bottom }}
    >
      {height > 0 && (
        <DiagonalLabel
          key={`${name}-${height}-${maxWidth}`}
          name={name}
          available={height}
          left={left}
          maxWidth={maxWidth}
          passed={passed}
        />
      )}
    </View>
  );
};

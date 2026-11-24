import { useState } from 'react';
import { type TextProps, View } from 'react-native';
import type { Station } from '~/@types/graphql';
import getStationNameR from '~/utils/getStationNameR';
import Typography from '../../../Typography';
import {
  HORIZONTAL_STATION_NAME_FONT_SIZE,
  HORIZONTAL_STATION_NAME_ROTATION_DEG,
  commonLineBoardStyles as styles,
} from '../styles/commonStyles';

const angle = (HORIZONTAL_STATION_NAME_ROTATION_DEG * Math.PI) / 180;
const lineHeight = Math.ceil(HORIZONTAL_STATION_NAME_FONT_SIZE * 1.25);
const lineStyle = { lineHeight, includeFontPadding: false };

const WrappedLines = ({
  name,
  width,
  passed,
}: {
  name: string;
  width: number;
  passed: boolean;
}) => {
  const [lines, setLines] = useState<string[]>([]);
  const measureLines: TextProps['onTextLayout'] = ({ nativeEvent }) => {
    setLines(nativeEvent.lines.map((line) => line.text.trimEnd()));
  };

  // 平行な行同士を1行高だけ離し、各行の左下を同じ高さに揃える。
  const step = lineHeight / Math.sin(angle);
  return (
    <>
      <Typography
        accessible={false}
        importantForAccessibility="no"
        onTextLayout={measureLines}
        textBreakStrategy="simple"
        style={[
          styles.stationNameHorizontal,
          lineStyle,
          {
            position: 'absolute',
            opacity: 0,
            width,
            transform: [],
          },
        ]}
      >
        {name}
      </Typography>
      {lines.map((line, index) => (
        <Typography
          key={`${index}-${line}`}
          style={[
            styles.stationNameHorizontal,
            passed && styles.grayColor,
            lineStyle,
            {
              position: 'absolute',
              bottom: 0,
              left:
                16 +
                (lineHeight * Math.sin(angle)) / 2 +
                (index - (lines.length - 1) / 2) * step,
              transformOrigin: 'left bottom',
              width,
            },
          ]}
        >
          {line}
        </Typography>
      ))}
    </>
  );
};

export const FittedEnglishStationName = ({
  station,
  passed,
  bottom,
}: {
  station: Station;
  passed: boolean;
  bottom: number;
}) => {
  const [height, setHeight] = useState(0);
  const name = getStationNameR(station);
  // 1行を回転した後の高さは width × sinθ + lineHeight × cosθ。
  const width = Math.floor(
    (height - lineHeight * Math.cos(angle)) / Math.sin(angle)
  );
  return (
    <View
      accessible
      accessibilityLabel={station.nameRoman ?? undefined}
      onLayout={({ nativeEvent }) => setHeight(nativeEvent.layout.height)}
      style={{ flex: 1, width: '100%', marginBottom: bottom }}
    >
      {width > 0 && (
        <WrappedLines
          key={`${name}-${width}`}
          name={name}
          width={width}
          passed={passed}
        />
      )}
    </View>
  );
};

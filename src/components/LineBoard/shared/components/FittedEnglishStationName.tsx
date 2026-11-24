import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import type { Station } from '~/@types/graphql';
import getStationNameR from '~/utils/getStationNameR';
import Typography from '../../../Typography';
import {
  HORIZONTAL_STATION_NAME_FONT_SIZE,
  HORIZONTAL_STATION_NAME_ROTATION_DEG,
  commonLineBoardStyles as styles,
} from '../styles/commonStyles';

const angle = (HORIZONTAL_STATION_NAME_ROTATION_DEG * Math.PI) / 180;

export const FittedEnglishStationName = ({
  station,
  passed,
  bottom,
}: {
  station: Station;
  passed: boolean;
  bottom: number;
}) => {
  const [area, setArea] = useState({ width: 0, height: 0 });
  const measure = ({ nativeEvent: { layout } }: LayoutChangeEvent) =>
    setArea({ width: layout.width, height: layout.height });
  const name = getStationNameR(station);
  const lines = name.split('\n').length;
  // 隣駅との垂直距離（駅の間隔 × sinθ）を超えない行高にする。
  const height = Math.min(
    Math.ceil(HORIZONTAL_STATION_NAME_FONT_SIZE * 1.4) * lines,
    area.width * Math.sin(angle),
    area.height
  );
  // 左下を軸に回転した矩形の縦幅は width × sinθ + height × cosθ。
  const width = Math.floor(
    (area.height - height * Math.cos(angle)) / Math.sin(angle)
  );

  return (
    <View
      onLayout={measure}
      style={{ flex: 1, width: '100%', marginBottom: bottom }}
    >
      {width > 0 && height > 0 && (
        <Typography
          adjustsFontSizeToFit
          numberOfLines={lines}
          style={[
            styles.stationNameHorizontal,
            passed && styles.grayColor,
            {
              position: 'absolute',
              bottom: 0,
              left: (height * Math.sin(angle)) / 2,
              transformOrigin: 'left bottom',
              width,
              height,
              includeFontPadding: false,
            },
          ]}
        >
          {name}
        </Typography>
      )}
    </View>
  );
};

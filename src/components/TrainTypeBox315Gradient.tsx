import { LinearGradient } from 'expo-linear-gradient';
import { mix } from 'polished';
import type React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

type Props = { trainTypeColor: string; style: StyleProp<ViewStyle> };

const TrainTypeBox315Gradient: React.FC<Props> = ({
  trainTypeColor,
  style,
}) => (
  <LinearGradient
    // 上部を明るく、中央より下で最も暗くし、下端で明るさを少し戻す。
    // 種別色そのものに明暗を付け、黒い色レイヤーで陰影が消えるのを防ぐ。
    colors={[
      mix(0.31, '#fff', trainTypeColor),
      mix(0.16, '#fff', trainTypeColor),
      mix(0.095, '#fff', trainTypeColor),
      mix(0.17, '#fff', trainTypeColor),
    ]}
    locations={[0, 0.35, 0.62, 1]}
    style={style}
  />
);

export default TrainTypeBox315Gradient;

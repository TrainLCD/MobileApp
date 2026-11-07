import { LinearGradient } from 'expo-linear-gradient';
import type React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

type Props = { trainTypeColor: string; style: StyleProp<ViewStyle> };

const TrainTypeBoxSaikyoGradient: React.FC<Props> = ({
  trainTypeColor,
  style,
}) => (
  <>
    <LinearGradient
      colors={['#000', '#000', '#fff']}
      locations={[0.1, 0.5, 0.9]}
      style={style}
    />
    <LinearGradient colors={['#aaaaaaff', '#aaaaaabb']} style={style} />
    <LinearGradient
      colors={['#000', '#000', '#fff']}
      locations={[0.1, 0.5, 0.9]}
      style={style}
    />
    <LinearGradient
      colors={[`${trainTypeColor}bb`, `${trainTypeColor}ff`]}
      style={style}
    />
  </>
);

export default TrainTypeBoxSaikyoGradient;

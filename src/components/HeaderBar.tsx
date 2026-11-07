import { LinearGradient } from 'expo-linear-gradient';
import type React from 'react';
import { StyleSheet, View } from 'react-native';

type HeaderBarProps = {
  lineColor: string;
  height: number;
  // 両端をぼかす色。ヘッダーの地色に合わせる
  edgeColor: string;
};

const headerBarStyles = StyleSheet.create({
  root: {
    width: '100%',
    backgroundColor: 'black',
  },
  gradient: {
    flex: 1,
  },
});

const HeaderBar: React.FC<HeaderBarProps> = ({
  lineColor,
  height,
  edgeColor,
}: HeaderBarProps) => (
  <View style={[headerBarStyles.root, { height }]}>
    <LinearGradient
      style={headerBarStyles.gradient}
      colors={[
        edgeColor,
        `${lineColor}bb`,
        `${lineColor}bb`,
        `${lineColor}bb`,
        edgeColor,
      ]}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={[0, 0]}
      end={[1, 1]}
    />
  </View>
);

export default HeaderBar;

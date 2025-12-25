import { LinearGradient } from 'expo-linear-gradient';
import type React from 'react';
import { View } from 'react-native';
import isTablet from '~/utils/isTablet';
import { BarTerminalEast } from '../../../BarTerminalEast';
import { useBarStyles } from '../hooks/useBarStyles';
import { commonLineBoardStyles as styles } from '../styles/commonStyles';

export type EmptyStationNameCellProps = {
  lastLineColor: string;
  isLast: boolean;
  hasTerminus: boolean;
};

export const EmptyStationNameCell: React.FC<EmptyStationNameCellProps> = ({
  lastLineColor,
  isLast,
  hasTerminus,
}: EmptyStationNameCellProps) => {
  const { left: barLeft, width: barWidth } = useBarStyles({});

  return (
    <View style={styles.stationNameContainer}>
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={[
          styles.bar,
          {
            left: barLeft,
            width: barWidth,
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
          },
        ]}
      />
      <LinearGradient
        colors={
          lastLineColor
            ? [`${lastLineColor}ff`, `${lastLineColor}bb`]
            : ['#000000ff', '#000000bb']
        }
        style={[
          styles.bar,
          {
            left: barLeft,
            width: barWidth,
          },
        ]}
      />
      {isLast ? (
        <BarTerminalEast
          width={isTablet ? 41 : 27}
          height={isTablet ? 48 : 32}
          style={[
            styles.barTerminal,
            {
              left: barLeft + barWidth,
              bottom: isTablet ? -52 : 32,
            },
          ]}
          lineColor={lastLineColor}
          hasTerminus={hasTerminus}
        />
      ) : null}
    </View>
  );
};

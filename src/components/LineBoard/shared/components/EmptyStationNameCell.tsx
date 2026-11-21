import { LinearGradient } from 'expo-linear-gradient';
import type React from 'react';
import { View } from 'react-native';
import isTablet from '~/utils/isTablet';
import { BarTerminalEast } from '../../../BarTerminalEast';
import { BarTerminalSaikyo } from '../../../BarTerminalSaikyo';
import { useBarStyles } from '../hooks/useBarStyles';
import { commonLineBoardStyles as styles } from '../styles/commonStyles';

export type EmptyStationNameCellProps = {
  lastLineColor: string;
  isLast: boolean;
  hasTerminus: boolean;
  saikyoGradient?: boolean;
};

export const EmptyStationNameCell: React.FC<EmptyStationNameCellProps> = ({
  lastLineColor,
  isLast,
  hasTerminus,
  saikyoGradient = false,
}: EmptyStationNameCellProps) => {
  const { left: barLeft, width: barWidth } = useBarStyles({});
  const BarTerminal = saikyoGradient ? BarTerminalSaikyo : BarTerminalEast;

  return (
    <View style={styles.stationNameContainer}>
      <LinearGradient
        colors={
          saikyoGradient
            ? ['#fff', '#000', '#000']
            : ['#fff', '#000', '#000', '#fff']
        }
        locations={saikyoGradient ? [0.1, 0.5, 0.9] : [0.5, 0.5, 0.5, 0.9]}
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
        <BarTerminal
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

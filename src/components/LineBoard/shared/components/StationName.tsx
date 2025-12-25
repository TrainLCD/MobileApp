import React, { useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import type { Station } from '~/@types/graphql';
import getStationNameR from '~/utils/getStationNameR';
import isTablet from '~/utils/isTablet';
import Typography from '../../../Typography';
import { commonLineBoardStyles as styles } from '../styles/commonStyles';

export interface StationNameProps {
  station: Station;
  en?: boolean;
  horizontal?: boolean;
  passed?: boolean;
  marginBottom?: number;
}

export const StationName: React.FC<StationNameProps> = ({
  station,
  en,
  horizontal,
  passed,
  marginBottom,
}: StationNameProps) => {
  const stationNameR = useMemo(() => getStationNameR(station), [station]);
  const dim = useWindowDimensions();

  const horizontalAdditionalStyle = useMemo(
    () => ({
      width: isTablet ? dim.height / 3.5 : dim.height / 2.5,
      marginBottom: marginBottom ?? (isTablet ? dim.height / 10 : dim.height / 6),
    }),
    [dim.height, marginBottom]
  );

  if (en) {
    return (
      <Typography
        style={[
          styles.stationNameHorizontal,
          passed ? styles.grayColor : null,
          horizontalAdditionalStyle,
        ]}
      >
        {stationNameR}
      </Typography>
    );
  }

  if (horizontal) {
    return (
      <Typography
        style={[
          styles.stationNameHorizontal,
          passed ? styles.grayColor : null,
          horizontalAdditionalStyle,
        ]}
      >
        {station.name}
      </Typography>
    );
  }

  return (
    <View style={styles.stationNameMapContainer}>
      {station.name?.split('').map((c, j) => (
        <Typography
          style={[styles.stationName, passed ? styles.grayColor : null]}
          key={`${j + 1}${c}`}
        >
          {c}
        </Typography>
      ))}
    </View>
  );
};

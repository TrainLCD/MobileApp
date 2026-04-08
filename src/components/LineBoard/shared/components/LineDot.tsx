import { LinearGradient } from 'expo-linear-gradient';
import type React from 'react';
import { View } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { useScale } from '~/hooks/useScale';
import getIsPass from '~/utils/isPass';
import isTablet from '~/utils/isTablet';
import PadLineMarks from '../../../PadLineMarks';
import PassChevronEast from '../../../PassChevronEast';
import { commonLineBoardStyles as styles } from '../styles/commonStyles';

export type LineDotProps = {
  station: Station;
  shouldGrayscale: boolean;
  transferLines: Line[];
  arrived: boolean;
  passed: boolean;
  isOdakyu?: boolean;
};

export const LineDot: React.FC<LineDotProps> = ({
  station,
  shouldGrayscale,
  transferLines,
  arrived,
  passed,
  isOdakyu = false,
}) => {
  const { widthScale } = useScale();

  if (getIsPass(station)) {
    return (
      <View style={styles.stationArea}>
        <View
          style={[
            styles.chevronAreaPass,
            {
              marginLeft: isTablet ? 0 : widthScale(5),
            },
          ]}
        >
          <PassChevronEast gradient={isOdakyu} />
        </View>
        <View style={styles.marksContainer}>
          <PadLineMarks
            shouldGrayscale={shouldGrayscale}
            transferLines={transferLines}
            station={station}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.stationArea}>
      <View style={styles.chevronArea}>
        <LinearGradient
          style={[
            styles.chevronGradient,
            isOdakyu && {
              width: isTablet ? 36 : 24,
              height: isTablet ? 36 : 24,
              borderRadius: isTablet ? 18 : 12,
              borderWidth: 1,
              borderColor: passed && !arrived ? '#bbb' : '#fff',
            },
          ]}
          colors={
            passed && !arrived
              ? ['#ccc', '#dadada']
              : isOdakyu
                ? ['#fff', '#e0e0e0', '#aaa']
                : ['#fdfbfb', '#ebedee']
          }
          {...(isOdakyu && { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } })}
        />
      </View>
      <View style={styles.marksContainer}>
        <PadLineMarks
          shouldGrayscale={shouldGrayscale}
          transferLines={transferLines}
          station={station}
        />
      </View>
    </View>
  );
};

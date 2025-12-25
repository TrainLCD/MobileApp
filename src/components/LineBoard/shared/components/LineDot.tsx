import { LinearGradient } from 'expo-linear-gradient';
import type React from 'react';
import { View } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { useScale } from '~/hooks/useScale';
import getIsPass from '~/utils/isPass';
import isTablet from '~/utils/isTablet';
import PadLineMarks from '../../../PadLineMarks';
import PassChevronTY from '../../../PassChevronTY';
import { commonLineBoardStyles as styles } from '../styles/commonStyles';

export type LineDotProps = {
  station: Station;
  shouldGrayscale: boolean;
  transferLines: Line[];
  arrived: boolean;
  passed: boolean;
};

export const LineDot: React.FC<LineDotProps> = ({
  station,
  shouldGrayscale,
  transferLines,
  arrived,
  passed,
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
          <PassChevronTY />
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
          style={styles.chevronGradient}
          colors={
            passed && !arrived ? ['#ccc', '#dadada'] : ['#fdfbfb', '#ebedee']
          }
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

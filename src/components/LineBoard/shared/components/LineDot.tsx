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
  round?: boolean;
};

export const LineDot: React.FC<LineDotProps> = ({
  station,
  shouldGrayscale,
  transferLines,
  arrived,
  passed,
  round = false,
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
          <PassChevronTY gradient={round} />
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
            round && {
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
              : round
                ? ['#fff', '#e0e0e0', '#aaa']
                : ['#fdfbfb', '#ebedee']
          }
          {...(round && { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } })}
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

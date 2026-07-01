import { LinearGradient } from 'expo-linear-gradient';
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { useScale } from '~/hooks/useScale';
import getIsPass from '~/utils/isPass';
import isTablet from '~/utils/isTablet';
import PadLineMarks from '../../../PadLineMarks';
import PassChevronEast from '../../../PassChevronEast';
import { commonLineBoardStyles as styles } from '../styles/commonStyles';

const localStyles = StyleSheet.create({
  estimatedMinutesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  estimatedMinutesText: {
    color: '#000',
    fontSize: isTablet ? 30 : 22,
    lineHeight: isTablet ? 32 : 24,
    fontWeight: '900',
    textAlign: 'center',
  },
});

export type LineDotProps = {
  station: Station;
  shouldGrayscale: boolean;
  transferLines: Line[];
  arrived: boolean;
  passed: boolean;
  isOdakyu?: boolean;
  estimatedMinutes?: number | null;
};

export const LineDot: React.FC<LineDotProps> = ({
  station,
  shouldGrayscale,
  transferLines,
  arrived,
  passed,
  isOdakyu = false,
  estimatedMinutes,
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

  const dotSizeStyle = isOdakyu
    ? {
        width: isTablet ? 36 : 24,
        height: isTablet ? 36 : 24,
        borderRadius: isTablet ? 18 : 12,
      }
    : null;

  return (
    <View style={styles.stationArea}>
      <View style={styles.chevronArea}>
        <LinearGradient
          style={[
            styles.chevronGradient,
            dotSizeStyle,
            isOdakyu && {
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
        {estimatedMinutes != null ? (
          // 実際に見えるドット（chevronGradient）と同じサイズ・位置に重ねることで、
          // chevronArea自体の幅(モバイルではドットより狭い)に引きずられず中央に揃える
          <View
            style={[
              styles.chevronGradient,
              dotSizeStyle,
              localStyles.estimatedMinutesOverlay,
            ]}
            pointerEvents="none"
          >
            <Text style={localStyles.estimatedMinutesText}>
              {Math.round(estimatedMinutes)}
            </Text>
          </View>
        ) : null}
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

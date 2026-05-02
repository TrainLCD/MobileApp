import React, { useEffect } from 'react';
import { StyleSheet, type TextStyle, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useClock } from '~/hooks';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import Typography from './Typography';

const AnimatedTypography = Animated.createAnimatedComponent(Typography);

const styles = StyleSheet.create({
  clockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockItem: {
    fontWeight: 'bold',
    textAlign: 'right',
    fontSize: isTablet ? RFValue(21) : RFValue(16),
  },
});

type Props = {
  style: ViewStyle | ViewStyle[];
  white?: boolean;
  bold?: boolean;
};

const Clock = ({ style, white, bold }: Props): React.ReactElement => {
  const [hours, minutes] = useClock();
  // コロン点滅は LCD らしさを保つため必須。
  // JS スレッドで毎 500ms に setState すると Header 配下を再レンダリングしてしまうため、
  // Reanimated で UI スレッドだけで完結させる。
  const colonOpacity = useSharedValue(0);

  useEffect(() => {
    colonOpacity.value = withRepeat(
      withTiming(1, { duration: 500, easing: Easing.linear }),
      -1,
      true
    );
  }, [colonOpacity]);

  const colonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: colonOpacity.value,
  }));

  const textCustomStyle: TextStyle = {
    color: white ? 'white' : '#3a3a3a',
    fontWeight: bold ? 'bold' : 'normal',
  };

  return (
    <View style={[style, styles.clockContainer]}>
      <Typography style={[styles.clockItem, textCustomStyle]}>
        {hours}
      </Typography>
      <AnimatedTypography
        style={[styles.clockItem, textCustomStyle, colonAnimatedStyle]}
      >
        :
      </AnimatedTypography>
      <Typography style={[styles.clockItem, textCustomStyle]}>
        {minutes}
      </Typography>
    </View>
  );
};

export default React.memo(Clock);

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
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
  // useNativeDriver でネイティブスレッドだけで完結させる。
  const colonOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(colonOpacity, {
          toValue: 0,
          duration: 0,
          delay: 500,
          useNativeDriver: true,
        }),
        Animated.timing(colonOpacity, {
          toValue: 1,
          duration: 0,
          delay: 500,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [colonOpacity]);

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
        style={[styles.clockItem, textCustomStyle, { opacity: colonOpacity }]}
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

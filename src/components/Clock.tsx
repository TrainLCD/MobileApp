import React, { useCallback, useState } from 'react';
import { StyleSheet, type TextStyle, View, type ViewStyle } from 'react-native';
import { useClock, useInterval } from '~/hooks';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import Typography from './Typography';

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
  const [colonOpacity, setColonOpacity] = useState(0);

  useInterval(
    useCallback(() => {
      setColonOpacity((prev) => (prev === 0 ? 1 : 0));
    }, []),
    500
  );

  const textCustomStyle: TextStyle = {
    color: white ? 'white' : '#3a3a3a',
    fontWeight: bold ? 'bold' : 'normal',
  };

  return (
    <View style={[style, styles.clockContainer]}>
      <Typography style={[styles.clockItem, textCustomStyle]}>
        {hours}
      </Typography>
      <Typography
        style={[styles.clockItem, textCustomStyle, { opacity: colonOpacity }]}
      >
        :
      </Typography>
      <Typography style={[styles.clockItem, textCustomStyle]}>
        {minutes}
      </Typography>
    </View>
  );
};

export default React.memo(Clock);

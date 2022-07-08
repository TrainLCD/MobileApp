import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import useClock from '../hooks/useClock';
import isTablet from '../utils/isTablet';

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
  style: ViewStyle;
  white?: boolean;
  bold?: boolean;
};

const Clock = ({ style, white, bold }: Props): React.ReactElement => {
  const [hours, minutes] = useClock();
  const [coronOpacity, setCoronOpacity] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCoronOpacity((prev) => (prev === 0 ? 1 : 0));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const textCustomStyle: TextStyle = {
    color: white ? 'white' : '#3a3a3a',
    fontWeight: bold ? 'bold' : 'normal',
  };

  return (
    <View style={[style, styles.clockContainer]}>
      <Text style={[styles.clockItem, textCustomStyle]}>{hours}</Text>
      <Text
        style={[styles.clockItem, textCustomStyle, { opacity: coronOpacity }]}
      >
        :
      </Text>
      <Text style={[styles.clockItem, textCustomStyle]}>{minutes}</Text>
    </View>
  );
};

Clock.defaultProps = {
  white: false,
  bold: false,
};

export default Clock;

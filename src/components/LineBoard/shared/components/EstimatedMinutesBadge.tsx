import type React from 'react';
import { Platform, StyleSheet, Text, type TextStyle } from 'react-native';
import { FONTS } from '~/constants';
import isTablet from '~/utils/isTablet';

const styles = StyleSheet.create({
  text: {
    color: '#000',
    fontSize: isTablet ? 30 : 22,
    lineHeight: isTablet ? 32 : 24,
    textAlign: 'center',
    fontFamily: FONTS.RobotoBold,
    letterSpacing: Platform.OS === 'ios' ? 0 : -1,
  },
});

export type EstimatedMinutesBadgeProps = {
  estimatedMinutes: number;
  style?: TextStyle;
};

export const EstimatedMinutesBadge: React.FC<EstimatedMinutesBadgeProps> = ({
  estimatedMinutes,
  style,
}) => <Text style={[styles.text, style]}>{Math.round(estimatedMinutes)}</Text>;

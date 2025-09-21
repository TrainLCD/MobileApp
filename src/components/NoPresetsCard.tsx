import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useThemeStore } from '~/hooks';
import { APP_THEME } from '~/models/Theme';
import { translate } from '~/translation';
import Typography from './Typography';

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
    // iOS shadow
    shadowColor: '#333',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    // Android
    elevation: 2,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
});

const NoPresetsCardBase: React.FC = () => {
  const isLEDTheme = useThemeStore((st) => st === APP_THEME.LED);

  const containerStyle = useMemo(
    () => [
      styles.root,
      { backgroundColor: isLEDTheme ? '#2A2A2A' : '#FCFCFC' },
    ],
    [isLEDTheme]
  );

  return (
    <View style={containerStyle}>
      <View style={styles.icon}>
        <Svg width="33" height="34" viewBox="0 0 33 34" fill="none">
          <Path
            d="M12.1901 21.6519L1 33M9.04998 10.1117L7.36458 9.9336L4.44311 12.8963L20.2693 28.9461L23.1908 25.9834L23.0152 24.2707M15.6074 8.55786L21.9289 1L32 11.2133L24.5835 17.5927M1 1.57439L31.9879 33"
            stroke="#666666"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      <Typography style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
        {translate('noPresets')}
      </Typography>
    </View>
  );
};

export const NoPresetsCard = React.memo(NoPresetsCardBase);

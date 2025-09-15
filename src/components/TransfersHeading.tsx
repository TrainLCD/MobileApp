import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { APP_THEME, type AppTheme } from '~/models/Theme';
import { translate } from '~/translation';
import { RFValue } from '~/utils/rfValue';
import { Heading } from './Heading';

const styles = StyleSheet.create({
  headingContainerMetro: {
    height: RFValue(32),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  headingMetro: {
    textAlign: 'center',
  },
  headingContainerSaikyo: {
    marginTop: 24,
    width: '75%',
    alignSelf: 'center',
    zIndex: 1,
  },
  headingSaikyo: { color: '#212121', fontWeight: '600', textAlign: 'center' },
});

export const TransfersHeading = ({ theme }: { theme: AppTheme }) => {
  switch (theme) {
    case APP_THEME.TOKYO_METRO:
    case APP_THEME.TY:
    case APP_THEME.TOEI:
      return (
        <LinearGradient
          colors={['#fcfcfc', '#f5f5f5', '#ddd']}
          locations={[0, 0.95, 1]}
          style={styles.headingContainerMetro}
        >
          <Heading style={styles.headingMetro}>{translate('transfer')}</Heading>
        </LinearGradient>
      );
    case APP_THEME.SAIKYO:
      return (
        <LinearGradient
          colors={['white', '#ccc', '#ccc', 'white']}
          start={[0, 1]}
          end={[1, 0]}
          locations={[0, 0.1, 0.9, 1]}
          style={styles.headingContainerSaikyo}
        >
          <Heading style={styles.headingSaikyo}>
            {translate('transfer')}
          </Heading>
        </LinearGradient>
      );
    default:
      return null;
  }
};

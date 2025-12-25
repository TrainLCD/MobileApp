import { Platform, StyleSheet } from 'react-native';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';

export const commonLineBoardStyles = StyleSheet.create({
  root: {
    height: '100%',
    flexDirection: 'row',
    justifyContent: isTablet ? 'flex-start' : undefined,
    marginLeft: 32,
    flex: 1,
  },
  bar: {
    position: 'absolute',
    bottom: isTablet ? -52 : 32,
    height: isTablet ? 48 : 32,
  },
  barTerminal: {
    position: 'absolute',
  },
  stationNameContainer: {
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isTablet ? 84 : undefined,
  },
  stationNameMapContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  stationName: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    marginLeft: 5,
    marginBottom: Platform.select({ android: -6, ios: 0 }),
  },
  stationNameHorizontal: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    transform: [{ rotate: '-55deg' }],
  },
  grayColor: {
    color: '#ccc',
  },
  stationArea: {
    width: isTablet ? 48 : 32,
    height: isTablet ? 36 : 24,
    position: 'absolute',
    zIndex: 9999,
    bottom: isTablet ? -46 : 32 + 4,
    overflow: 'visible',
  },
  chevron: {
    position: 'absolute',
    zIndex: 9999,
    width: isTablet ? 48 : 32,
    height: isTablet ? 48 : 32,
    bottom: isTablet ? 198 : 32,
  },
  chevronArea: {
    width: isTablet ? 48 : 16,
    height: isTablet ? 32 : 24,
  },
  chevronAreaPass: {
    width: isTablet ? 48 : 16,
    height: isTablet ? 32 : 24,
  },
  chevronGradient: {
    width: isTablet ? 48 : 32,
    height: isTablet ? 36 : 24,
  },
  marksContainer: {
    top: 38,
    position: 'absolute',
  },
  nameCommon: {
    marginBottom: isTablet ? undefined : 64,
  },
  longOrEnName: {
    flex: 1,
    width: '100%',
    marginLeft: isTablet ? -24 : -16,
    justifyContent: 'flex-end',
  },
  jaName: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});

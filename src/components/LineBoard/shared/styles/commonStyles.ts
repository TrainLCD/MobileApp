import { Platform, StyleSheet } from 'react-native';
import { FONTS } from '~/constants';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';

// Shared bar positioning constants
export const BAR_BOTTOM_WEST = isTablet ? 32 : 48;
export const BAR_BOTTOM_JO = isTablet ? 32 : 48;
export const BAR_TERMINAL_BOTTOM_JO = isTablet ? 48 : 58;

export const commonLineBoardStyles = StyleSheet.create({
  root: {
    height: '100%',
    flexDirection: 'row',
    justifyContent: isTablet ? 'flex-start' : undefined,
    marginLeft: 32,
    flex: 1,
  },
  // Root variant for West/JO style
  rootWestJO: {
    flex: 1,
    bottom: isTablet ? '40%' : undefined,
  },
  bar: {
    position: 'absolute',
    bottom: isTablet ? -52 : 32,
    height: isTablet ? 48 : 32,
  },
  // Bar variant for West style
  barWest: {
    position: 'absolute',
    bottom: BAR_BOTTOM_WEST,
    height: isTablet ? 64 : 32,
  },
  // Bar variant for JO style
  barJO: {
    position: 'absolute',
    bottom: BAR_BOTTOM_JO,
    height: isTablet ? 64 : 40,
  },
  barTerminal: {
    position: 'absolute',
  },
  // Bar terminal variant for West style (triangle shape)
  barTerminalWest: {
    position: 'absolute',
    width: 0,
    height: 0,
    bottom: BAR_BOTTOM_WEST,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: isTablet ? 32 : 16,
    borderRightWidth: isTablet ? 32 : 16,
    borderBottomWidth: isTablet ? 64 : 32,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '90deg' }],
    margin: 0,
    marginLeft: -6,
    borderWidth: 0,
  },
  // Bar terminal variant for JO style
  barTerminalJO: {
    bottom: BAR_TERMINAL_BOTTOM_JO,
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: isTablet ? 32 : 20,
    borderRightWidth: isTablet ? 32 : 20,
    borderBottomWidth: isTablet ? 32 : 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '90deg' }],
  },
  stationNameWrapper: {
    flexDirection: 'row',
    justifyContent: isTablet ? 'space-between' : undefined,
    marginLeft: 32,
    flex: 1,
  },
  // Station name wrapper variant for JO style
  stationNameWrapperJO: {
    flexDirection: 'row',
    flex: 1,
  },
  stationNameContainer: {
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isTablet ? 84 : undefined,
  },
  // Station name container variant for West/JO style
  stationNameContainerWestJO: {
    position: 'relative',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isTablet ? 110 : undefined,
    paddingBottom: 0,
  },
  // Station name container variant for JO style
  stationNameContainerJO: {
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isTablet ? 110 : undefined,
    paddingBottom: isTablet ? undefined : 96,
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
  // Station name variant for West style
  stationNameWest: {
    width: isTablet ? 48 : 32,
    fontSize: RFValue(18),
    fontWeight: 'bold',
    marginBottom: Platform.select({ android: -6, ios: 0 }),
    marginLeft: 5,
    bottom: isTablet ? 32 : 0,
  },
  // Station name variant for JO style
  stationNameJO: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    marginLeft: 12,
    marginBottom: Platform.select({ android: -6, ios: 0 }),
  },
  stationNameHorizontal: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    transform: [{ rotate: '-55deg' }],
  },
  // Station name English style (shared)
  stationNameEn: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
  },
  // Station name English variant for JO style
  stationNameEnJO: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    transform: [{ rotate: '-55deg' }],
    marginBottom: 90,
    marginLeft: -32,
    width: 250,
  },
  // Vertical station name for JO style
  verticalStationNameJO: {
    marginBottom: 0,
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
  // Chevron variant for West style
  chevronWest: {
    marginLeft: isTablet ? 48 : 24,
    width: isTablet ? 48 : 32,
    height: isTablet ? 36 : 24,
    marginTop: isTablet ? 6 : 2,
  },
  // Chevron variant for JO style (position-based)
  chevronJO: {
    position: 'absolute',
    bottom: BAR_BOTTOM_JO,
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
  // Line dot variant for West style
  lineDotWest: {
    width: isTablet ? 48 : 28,
    height: isTablet ? 48 : 28,
    position: 'absolute',
    zIndex: 9999,
    bottom: isTablet ? -70 : 50,
    overflow: 'visible',
    borderRadius: 24,
  },
  // Line dot variant for JO style
  lineDotJO: {
    height: isTablet ? 48 : 28,
    position: 'absolute',
    zIndex: 9999,
    bottom: isTablet ? -70 : 54,
  },
  // Arrived line dot for West style
  arrivedLineDotWest: {
    backgroundColor: 'crimson',
    width: isTablet ? 44 : 24,
    height: isTablet ? 44 : 24,
    borderRadius: 22,
    position: 'absolute',
    left: 2,
    top: 2,
  },
  // Arrived line dot for JO style
  arrivedLineDotJO: {
    width: isTablet ? 48 : 28,
    height: isTablet ? 48 : 28,
    borderRadius: 22,
    position: 'absolute',
    left: 2,
    top: 2,
  },
  // Top bar indicator for West style (tablet)
  topBarWest: {
    width: 8,
    height: 8,
    backgroundColor: '#212121',
    alignSelf: 'center',
    marginTop: -16,
  },
  // Pass mark for West style
  passMarkWest: {
    width: isTablet ? 24 : 14,
    height: isTablet ? 8 : 6,
    position: 'absolute',
    left: isTablet ? 48 + 38 : 28 + 28, // dotWidth + margin
    top: isTablet ? 48 * 0.45 : 28 * 0.4, // (almost) half dotHeight
  },
  // Numbering container for West style
  numberingContainerWest: {
    position: 'absolute',
    bottom: isTablet ? 0 : BAR_BOTTOM_WEST + 44,
    marginLeft: isTablet ? -48 * 0.125 : -28 * 0.25,
    width: isTablet ? 50 * 1.25 : 28 * 1.75,
    height: isTablet ? 48 / 2 : 24 / 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Numbering text for West style
  numberingTextWest: {
    fontWeight: 'bold',
    fontSize: isTablet ? 48 / 2.5 : 24 / 1.75,
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: -2,
    textAlign: 'center',
  },
  // Bar dot for JO style
  barDotJO: {
    position: 'absolute',
    bottom: BAR_BOTTOM_JO + 16,
    width: 32,
    height: 32,
    zIndex: 1,
    borderRadius: 32,
  },
  // Pass chevron for JO style
  passChevronJO: {
    width: isTablet ? 48 : 28,
    height: isTablet ? 48 : 28,
    position: 'absolute',
    zIndex: 9999,
    bottom: isTablet ? -70 : 54,
  },
  // Numbering icon container for JO style
  numberingIconContainerJO: {
    position: 'absolute',
    bottom: -155,
    left: isTablet ? -16 : -32,
    transform: [{ scale: 0.3 }],
  },
  // Pad line marks container for JO style
  padLineMarksContainerJO: {
    position: 'absolute',
  },
});

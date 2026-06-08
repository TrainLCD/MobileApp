import { Platform, type ViewStyle } from 'react-native';
import isTablet from '../../utils/isTablet';

export type HeaderEastThemeConfig = {
  gradientColors: readonly [string, string, ...string[]];
  gradientLocations: readonly [number, number, ...number[]];
  rootStyle: ViewStyle;
  gradientRootExtraStyle?: ViewStyle;
  textColor: string;
  stationNameColor?: string;
  bottomPaddingBottom: number;
  divider: {
    height: number;
    color: 'dynamic' | string;
    extraStyle?: ViewStyle;
  };
  secondaryDivider?: {
    height: number;
    color: string;
    extraStyle?: ViewStyle;
  };
  numberingIcon: {
    wrapped: boolean;
    withDarkTheme: boolean;
    transformOrigin: 'center' | 'top' | 'bottom' | undefined;
  };
  trainTypeBox: {
    localTypePrefix: string;
    nextTrainTypeColor: string;
    darkenColor?: boolean;
    fontSizeScale?: number;
  };
  stationNameContainerAlignItems?: 'flex-end' | 'center';
};

export const tokyoMetroConfig: HeaderEastThemeConfig = {
  gradientColors: ['#fcfcfc', '#fcfcfc', '#eee', '#fcfcfc', '#fcfcfc'] as const,
  gradientLocations: [0, 0.45, 0.5, 0.6, 0.6] as const,
  rootStyle: {
    shadowColor: '#333',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 1,
    paddingBottom: 4,
  },
  textColor: '#555',
  stationNameColor: '#000',
  bottomPaddingBottom: 0,
  divider: {
    height: isTablet ? 6 : 4,
    color: 'dynamic',
  },
  numberingIcon: {
    wrapped: true,
    withDarkTheme: false,
    transformOrigin: Platform.OS === 'ios' ? 'center' : undefined,
  },
  trainTypeBox: {
    localTypePrefix: '',
    nextTrainTypeColor: '#444',
  },
  stationNameContainerAlignItems: 'flex-end',
};

export const tyConfig: HeaderEastThemeConfig = {
  gradientColors: ['#333', '#212121', '#000'] as const,
  gradientLocations: [0, 0.5, 0.5] as const,
  rootStyle: {},
  gradientRootExtraStyle: {
    shadowColor: '#333',
    shadowOpacity: 1,
    shadowRadius: 1,
  },
  textColor: '#fff',
  bottomPaddingBottom: 8,
  divider: {
    height: isTablet ? 4 : 2,
    color: 'crimson',
    extraStyle: {
      marginTop: 2,
      shadowColor: '#ccc',
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 0,
      shadowOpacity: 1,
      elevation: 2,
    },
  },
  numberingIcon: {
    wrapped: false,
    withDarkTheme: true,
    transformOrigin: 'bottom',
  },
  trainTypeBox: {
    localTypePrefix: 'ty',
    nextTrainTypeColor: '#fff',
  },
};

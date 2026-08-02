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
    paddingBottom: 4,
  },
  textColor: '#555',
  stationNameColor: '#000',
  bottomPaddingBottom: 0,
  divider: {
    height: isTablet ? 6 : 4,
    color: 'dynamic',
    extraStyle: {
      // boxShadow はルートのボーダーボックス基準で描画されるため、
      // ルート(paddingBottom: 4 の透明領域を持つ)に付けると影が divider から
      // 数px下に離れてしまう。divider 自身に付けて境界線に密着させる。
      boxShadow: '0px 2px 2px rgba(51, 51, 51, 0.25)',
    },
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
  textColor: '#fff',
  bottomPaddingBottom: 8,
  divider: {
    height: isTablet ? 4 : 2,
    color: 'crimson',
    extraStyle: {
      marginTop: 2,
      boxShadow: '0px 2px 0px #ccc',
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

import { APP_THEME, type AppTheme } from '~/models/Theme';
import { translate } from '~/translation';

export type ThemeInfo = {
  description: string;
  spImage: number;
  tabletImage: number;
};

type ThemeInfoData = {
  descriptionKey: string;
  spImage: number;
  tabletImage: number;
};

const APP_THEME_INFO_MAP: Record<AppTheme, ThemeInfoData> = {
  [APP_THEME.TOKYO_METRO]: {
    descriptionKey: 'themeDescriptionTokyoMetro',
    spImage: require('../../assets/images/themes/tokyo-metro-sp.webp'),
    tabletImage: require('../../assets/images/themes/tokyo-metro-tablet.webp'),
  },
  [APP_THEME.TOEI]: {
    descriptionKey: 'themeDescriptionToei',
    spImage: require('../../assets/images/themes/toei-sp.webp'),
    tabletImage: require('../../assets/images/themes/toei-tablet.webp'),
  },
  [APP_THEME.YAMANOTE]: {
    descriptionKey: 'themeDescriptionYamanote',
    spImage: require('../../assets/images/themes/yamanote-sp.webp'),
    tabletImage: require('../../assets/images/themes/yamanote-tablet.webp'),
  },
  [APP_THEME.JR_WEST]: {
    descriptionKey: 'themeDescriptionJrWest',
    spImage: require('../../assets/images/themes/jr-west-sp.webp'),
    tabletImage: require('../../assets/images/themes/jr-west-tablet.webp'),
  },
  [APP_THEME.TY]: {
    descriptionKey: 'themeDescriptionTy',
    spImage: require('../../assets/images/themes/ty-sp.webp'),
    tabletImage: require('../../assets/images/themes/ty-tablet.webp'),
  },
  [APP_THEME.SAIKYO]: {
    descriptionKey: 'themeDescriptionSaikyo',
    spImage: require('../../assets/images/themes/saikyo-sp.webp'),
    tabletImage: require('../../assets/images/themes/saikyo-tablet.webp'),
  },
  [APP_THEME.LED]: {
    descriptionKey: 'themeDescriptionLed',
    spImage: require('../../assets/images/themes/led-sp.webp'),
    tabletImage: require('../../assets/images/themes/led-tablet.webp'),
  },
  [APP_THEME.JO]: {
    descriptionKey: 'themeDescriptionJo',
    spImage: require('../../assets/images/themes/jo-sp.webp'),
    tabletImage: require('../../assets/images/themes/jo-tablet.webp'),
  },
  [APP_THEME.JL]: {
    descriptionKey: 'themeDescriptionJl',
    spImage: require('../../assets/images/themes/jl-sp.webp'),
    tabletImage: require('../../assets/images/themes/jl-tablet.webp'),
  },
  [APP_THEME.JR_KYUSHU]: {
    descriptionKey: 'themeDescriptionJrKyushu',
    spImage: require('../../assets/images/themes/jr-kyushu-sp.webp'),
    tabletImage: require('../../assets/images/themes/jr-kyushu-tablet.webp'),
  },
} as const;

export const getThemeInfo = (theme: AppTheme): ThemeInfo => {
  const { descriptionKey, spImage, tabletImage } = APP_THEME_INFO_MAP[theme];
  return {
    description: translate(descriptionKey),
    spImage,
    tabletImage,
  };
};

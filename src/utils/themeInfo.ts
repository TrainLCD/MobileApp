import { APP_THEME, type AppTheme } from '~/models/Theme';
import { translate } from '~/translation';

export type ThemeInfo = {
  description: string;
  spImage: number;
  tabletImage: number;
};

export const getThemeInfo = (theme: AppTheme): ThemeInfo => {
  const infoMap: Record<AppTheme, ThemeInfo> = {
    [APP_THEME.TOKYO_METRO]: {
      description: translate('themeDescriptionTokyoMetro'),
      spImage: require('../../assets/images/themes/tokyo-metro-sp.webp'),
      tabletImage: require('../../assets/images/themes/tokyo-metro-tablet.webp'),
    },
    [APP_THEME.TOEI]: {
      description: translate('themeDescriptionToei'),
      spImage: require('../../assets/images/themes/toei-sp.webp'),
      tabletImage: require('../../assets/images/themes/toei-tablet.webp'),
    },
    [APP_THEME.YAMANOTE]: {
      description: translate('themeDescriptionYamanote'),
      spImage: require('../../assets/images/themes/yamanote-sp.webp'),
      tabletImage: require('../../assets/images/themes/yamanote-tablet.webp'),
    },
    [APP_THEME.JR_WEST]: {
      description: translate('themeDescriptionJrWest'),
      spImage: require('../../assets/images/themes/jr-west-sp.webp'),
      tabletImage: require('../../assets/images/themes/jr-west-tablet.webp'),
    },
    [APP_THEME.TY]: {
      description: translate('themeDescriptionTy'),
      spImage: require('../../assets/images/themes/ty-sp.webp'),
      tabletImage: require('../../assets/images/themes/ty-tablet.webp'),
    },
    [APP_THEME.SAIKYO]: {
      description: translate('themeDescriptionSaikyo'),
      spImage: require('../../assets/images/themes/saikyo-sp.webp'),
      tabletImage: require('../../assets/images/themes/saikyo-tablet.webp'),
    },
    [APP_THEME.LED]: {
      description: translate('themeDescriptionLed'),
      spImage: require('../../assets/images/themes/led-sp.webp'),
      tabletImage: require('../../assets/images/themes/led-tablet.webp'),
    },
    [APP_THEME.JO]: {
      description: translate('themeDescriptionJo'),
      spImage: require('../../assets/images/themes/jo-sp.webp'),
      tabletImage: require('../../assets/images/themes/jo-tablet.webp'),
    },
    [APP_THEME.JL]: {
      description: translate('themeDescriptionJl'),
      spImage: require('../../assets/images/themes/jl-sp.webp'),
      tabletImage: require('../../assets/images/themes/jl-tablet.webp'),
    },
    [APP_THEME.JR_KYUSHU]: {
      description: translate('themeDescriptionJrKyushu'),
      spImage: require('../../assets/images/themes/jr-kyushu-sp.webp'),
      tabletImage: require('../../assets/images/themes/jr-kyushu-tablet.webp'),
    },
  };
  return infoMap[theme];
};

import { darken, getLuminance, parseToHsl, setLightness } from 'polished';

const FALLBACK_ACCENT = '#888888';

// 白基調の地の上に文字色として置いても読めるよう、明るい路線色は暗めに倒す。
const LIGHT_ACCENT_MAX_LUMINANCE = 0.5;

// 暗い地の上では逆に路線色が沈むため、HSL の明度に下限を設けて起こす。
// 輝度ではなく明度で測って明度を直すのは、変換の前後が同じ尺度で読めるため。
const DARK_ACCENT_MIN_LIGHTNESS = 0.62;

const readableAccentColor = (color: string): string => {
  try {
    return getLuminance(color) > LIGHT_ACCENT_MAX_LUMINANCE
      ? darken(0.25, color)
      : color;
  } catch {
    return FALLBACK_ACCENT;
  }
};

const luminousAccentColor = (color: string): string => {
  try {
    const { lightness } = parseToHsl(color);
    return lightness >= DARK_ACCENT_MIN_LIGHTNESS
      ? color
      : setLightness(DARK_ACCENT_MIN_LIGHTNESS, color);
  } catch {
    return FALLBACK_ACCENT;
  }
};

/** 配色スキームに合わせて地の上で読める路線色に直す */
export const accentColorFor = (color: string, isDark: boolean): string =>
  isDark ? luminousAccentColor(color) : readableAccentColor(color);

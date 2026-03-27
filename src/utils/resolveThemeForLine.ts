import type { Line } from '~/@types/graphql';
import { YAMANOTE_LINE_ID } from '~/constants/line';
import { APP_THEME, type AppTheme } from '~/models/Theme';

const LINE_ID_TO_THEME: Record<number, AppTheme> = {
  [YAMANOTE_LINE_ID]: APP_THEME.YAMANOTE,
  11321: APP_THEME.SAIKYO,
  11308: APP_THEME.JO,
  11314: APP_THEME.JO,
  11344: APP_THEME.JL,
  99310: APP_THEME.TY, // みなとみらい線（東急東横線と直通）
};

const COMPANY_PREFIX_TO_THEME: [string, AppTheme][] = [
  ['東京メトロ', APP_THEME.TOKYO_METRO],
  ['都営', APP_THEME.TOEI],
  ['JR西日本', APP_THEME.JR_WEST],
  ['JR九州', APP_THEME.JR_KYUSHU],
  ['東急', APP_THEME.TY],
  ['小田急', APP_THEME.ODAKYU],
];

const DEFAULT_THEME = APP_THEME.TOKYO_METRO;

export const resolveThemeForLine = (line: Line | null): AppTheme => {
  if (!line) {
    return DEFAULT_THEME;
  }

  if (line.id != null) {
    const theme = LINE_ID_TO_THEME[line.id];
    if (theme) {
      return theme;
    }
  }

  const companyName = line.company?.nameShort;
  if (companyName) {
    const match = COMPANY_PREFIX_TO_THEME.find(([prefix]) =>
      companyName.startsWith(prefix)
    );
    if (match) {
      return match[1];
    }
  }

  return DEFAULT_THEME;
};

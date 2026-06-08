import { atom } from 'jotai';
import {
  APP_THEME,
  type AppTheme,
  THEME_PREFERENCE,
  type ThemePreference,
} from '../../models/Theme';
import { resolveThemeForLine } from '../../utils/resolveThemeForLine';
import lineState from './line';
import stationState from './station';

export const themePreferenceAtom = atom<ThemePreference>(THEME_PREFERENCE.AUTO);

export const themeAtom = atom<AppTheme>((get) => {
  const preference = get(themePreferenceAtom);
  if (preference !== THEME_PREFERENCE.AUTO) {
    return preference as AppTheme;
  }

  const { selectedLine } = get(lineState);
  const { station, stations, selectedDirection } = get(stationState);

  // useCurrentStation相当: stations内から現在駅を特定
  const currentStation =
    stations.find((s) => s.id === station?.id) ??
    stations.find((s) => s.groupId === station?.groupId);

  // useCurrentLine相当: 現在駅のgroupIdから実際の路線を取得（直通運転対応）
  const orderedStations =
    selectedDirection === 'INBOUND' ? stations.slice().reverse() : stations;
  const actualCurrentStation = orderedStations.find(
    (rs) => rs.groupId === currentStation?.groupId
  );

  // selectedLineがnullの場合はcurrentLineもnull（useCurrentLineと同じ挙動）
  const currentLine = (selectedLine && actualCurrentStation?.line) ?? null;
  return resolveThemeForLine(currentLine);
});

// 派生atom: LEDテーマかどうか
export const isLEDThemeAtom = atom((get) => get(themeAtom) === APP_THEME.LED);

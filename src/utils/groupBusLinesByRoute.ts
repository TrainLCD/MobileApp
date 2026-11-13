import type { Line } from '~/@types/graphql';

export type BusRouteGroup = {
  key: string;
  name: string;
  lines: Line[];
};

/** 系統番号と路線名が併記されている場合だけ分離します。 */
export const getBusRouteLabel = (line: Line) => {
  const name = line.nameShort?.trim() || line.nameFull?.trim() || '';
  const match = name.match(
    /^([A-Za-z0-9０-９Ａ-Ｚａ-ｚ-]*[0-9０-９][A-Za-z0-9０-９Ａ-Ｚａ-ｚ-]*)[\s　]+(.+)$/
  );
  return { name: match?.[2] ?? name, code: match?.[1] ?? name };
};

export const groupBusLinesByRoute = (
  lines: readonly Line[]
): BusRouteGroup[] => {
  const groups = new Map<string, BusRouteGroup>();
  for (const line of lines) {
    const { name } = getBusRouteLabel(line);
    // 事業者または路線名が不明なら、別路線を誤って統合しません。
    const key = JSON.stringify(
      line.company?.id != null && name
        ? ['route', line.company.id, name]
        : ['line', line.id]
    );
    const group = groups.get(key);
    if (group) group.lines.push(line);
    else groups.set(key, { key, name, lines: [line] });
  }
  return [...groups.values()];
};

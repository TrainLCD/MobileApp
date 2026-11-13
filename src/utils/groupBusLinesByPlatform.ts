import type { Line } from '~/@types/graphql';

export type BusPlatformGroup = {
  key: string;
  platformCode: string | null;
  lines: Line[];
};

/** 全系統にのりば情報がなければ、従来の一覧を使うため null を返します。 */
export const groupBusLinesByPlatform = (
  lines: readonly Line[]
): BusPlatformGroup[] | null => {
  if (!lines.some((line) => line.station?.platformCode?.trim())) return null;

  const groups = new Map<string, BusPlatformGroup>();
  for (const line of lines) {
    const code = line.station?.platformCode?.trim() || null;
    // 別の停留所の同じ番号を一つののりばとして扱わない。
    const stopKey = line.station?.groupId ?? line.station?.name ?? '';
    const key = code ? JSON.stringify([stopKey, code]) : 'other';
    let group = groups.get(key);
    if (!group) {
      group = { key, platformCode: code, lines: [] };
      groups.set(key, group);
    }
    group.lines.push(line);
  }
  // API の掲載順を保ち、のりば不明の系統だけ最後にまとめる。
  return [...groups.values()]
    .filter((g) => g.platformCode != null)
    .concat(
      groups.has('other') ? [groups.get('other') as BusPlatformGroup] : []
    );
};

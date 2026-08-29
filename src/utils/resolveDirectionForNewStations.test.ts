import { createStation } from '~/utils/test/factories';
import { resolveDirectionForNewStations } from './resolveDirectionForNewStations';

const TOKAIDO = { id: 3 };
const JOBAN = { id: 11319 };

// 東海道線 普通(東京→沼津)
const tokaidoStations = [
  createStation(1130101, { name: '東京', line: TOKAIDO }),
  createStation(1130102, { name: '新橋', line: TOKAIDO }),
  createStation(1130103, { name: '品川', line: TOKAIDO }),
  createStation(1130130, { name: '沼津', line: TOKAIDO }),
];

// 常磐線直通 快速(品川→原ノ町)。品川・新橋・東京は東海道線の駅IDを共有する
const jobanRapidStations = [
  createStation(1130103, { name: '品川', line: TOKAIDO }),
  createStation(1130102, { name: '新橋', line: TOKAIDO }),
  createStation(1130101, { name: '東京', line: TOKAIDO }),
  createStation(1131801, { name: '上野', line: JOBAN }),
  createStation(1131899, { name: '原ノ町', line: JOBAN }),
];

describe('resolveDirectionForNewStations', () => {
  it('並び順が反転する系統では進行方向を引き直す', () => {
    // 品川から東京方面(東海道線ではOUTBOUND)へ向かう途中で常磐線快速へ変更
    expect(
      resolveDirectionForNewStations(
        tokaidoStations,
        jobanRapidStations,
        tokaidoStations[2],
        'OUTBOUND'
      )
    ).toBe('INBOUND');
  });

  it('並び順が同じ向きなら方向を維持する', () => {
    const extendedTokaido = [
      ...tokaidoStations,
      createStation(1130140, { name: '静岡', line: TOKAIDO }),
    ];
    expect(
      resolveDirectionForNewStations(
        tokaidoStations,
        extendedTokaido,
        tokaidoStations[2],
        'INBOUND'
      )
    ).toBe('INBOUND');
  });

  it('現在駅が新しい駅一覧に無くても前方の共通駅から方向を決める', () => {
    // 沼津(新系統に存在しない)から東京方面へ向かっている状態
    expect(
      resolveDirectionForNewStations(
        tokaidoStations,
        jobanRapidStations,
        tokaidoStations[3],
        'OUTBOUND'
      )
    ).toBe('INBOUND');
  });

  it('共通駅が1駅以下の場合は従来の方向を維持する', () => {
    const disjointStations = [
      createStation(9000001, { name: '甲', line: JOBAN }),
      createStation(9000002, { name: '乙', line: JOBAN }),
    ];
    expect(
      resolveDirectionForNewStations(
        tokaidoStations,
        disjointStations,
        tokaidoStations[2],
        'INBOUND'
      )
    ).toBe('INBOUND');
  });

  it('駅IDが変わる直通系統では groupId で読み替える', () => {
    const renumbered = jobanRapidStations.map((s, i) =>
      createStation(2000000 + i, {
        name: s.name,
        groupId: s.groupId,
        line: JOBAN,
      })
    );
    expect(
      resolveDirectionForNewStations(
        tokaidoStations,
        renumbered,
        tokaidoStations[2],
        'OUTBOUND'
      )
    ).toBe('INBOUND');
  });

  it('方向未確定・駅数不足のときはそのまま返す', () => {
    expect(
      resolveDirectionForNewStations(
        tokaidoStations,
        jobanRapidStations,
        tokaidoStations[2],
        null
      )
    ).toBeNull();
    expect(
      resolveDirectionForNewStations(
        tokaidoStations,
        [jobanRapidStations[0]],
        tokaidoStations[2],
        'INBOUND'
      )
    ).toBe('INBOUND');
  });
});

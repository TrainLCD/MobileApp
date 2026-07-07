import {
  APPROACH_LEAD_MAX_MIN,
  APPROACH_LEAD_MIN_MIN,
  APPROACH_LEAD_RATIO,
  type EstimateEtaPhaseOptions,
  type EtaAnchor,
  type EtaFallbackStop,
  estimateEtaPhase,
} from './etaFallback';

// 観測時刻を0固定し、経過分をミリ秒へ変換して nowMs を作る。
// 仮想累積分 m = base + elapsed で評価される。
const OBSERVED_AT_MS = 0;
const min = (n: number): number => n * 60_000;

const defaultOptions: EstimateEtaPhaseOptions = {
  arrivalConfirmMarginMin: 0.5,
  minDwellMin: 0.5,
};

// 4駅の地下鉄区間(進行方向順・絶対累積分)。
const baseStops: EtaFallbackStop[] = [
  { stationId: 1, cumulativeMinutes: 0, departureCumulativeMinutes: 0 },
  { stationId: 2, cumulativeMinutes: 2, departureCumulativeMinutes: 2.5 },
  { stationId: 3, cumulativeMinutes: 4.5, departureCumulativeMinutes: 5 },
  { stationId: 4, cumulativeMinutes: 7, departureCumulativeMinutes: 7 },
];

describe('estimateEtaPhase', () => {
  describe('DEPARTED アンカー', () => {
    // 駅2を発車済み。base = dep(2.5)、走査は駅3から。
    const anchor: EtaAnchor = {
      stationId: 2,
      kind: 'DEPARTED',
      observedAtMs: OBSERVED_AT_MS,
    };

    it('発車直後は次駅へのRUNNING', () => {
      // m = 3.0 (< arr3.5? arr=4.5, lead=0.8, arr-lead=3.7)
      const phase = estimateEtaPhase(
        baseStops,
        anchor,
        min(0.5),
        defaultOptions
      );
      expect(phase).toEqual({ kind: 'RUNNING', targetStationId: 3 });
    });

    it('接近窓ではAPPROACHING', () => {
      // m = 4.0 (>= arr-lead 3.7, < effArr 5.0)
      const phase = estimateEtaPhase(
        baseStops,
        anchor,
        min(1.5),
        defaultOptions
      );
      expect(phase).toEqual({ kind: 'APPROACHING', targetStationId: 3 });
    });

    it('到着確定マージン経過後はDWELLING', () => {
      // m = 5.2 (>= effArr 5.0, < effDep 5.5)
      const phase = estimateEtaPhase(
        baseStops,
        anchor,
        min(2.7),
        defaultOptions
      );
      expect(phase).toEqual({ kind: 'DWELLING', stationId: 3 });
    });

    it('発車後はさらに次駅のRUNNING', () => {
      // m = 5.6 (駅3は effDep 5.5 を過ぎ発車済み。駅4 arr-lead=6.2)
      const phase = estimateEtaPhase(
        baseStops,
        anchor,
        min(3.1),
        defaultOptions
      );
      expect(phase).toEqual({ kind: 'RUNNING', targetStationId: 4 });
    });
  });

  describe('AT_STATION アンカー', () => {
    // 駅2に停車中。base = arr(2)、走査は駅2自身から。
    const anchor: EtaAnchor = {
      stationId: 2,
      kind: 'AT_STATION',
      observedAtMs: OBSERVED_AT_MS,
    };

    it('停車中は自駅のDWELLING', () => {
      // m = 2.2 (< effDep 2.5)
      const phase = estimateEtaPhase(
        baseStops,
        anchor,
        min(0.2),
        defaultOptions
      );
      expect(phase).toEqual({ kind: 'DWELLING', stationId: 2 });
    });

    it('発車分経過後は次駅のRUNNING', () => {
      // m = 3.0 (>= effDep 2.5、駅3 arr-lead=3.7)
      const phase = estimateEtaPhase(
        baseStops,
        anchor,
        min(1.0),
        defaultOptions
      );
      expect(phase).toEqual({ kind: 'RUNNING', targetStationId: 3 });
    });

    it('自駅の停車判定にはマージンを加算しない', () => {
      // マージンを大きくしても自駅の effDep は dep/minDwell のみで決まる。
      const options: EstimateEtaPhaseOptions = {
        arrivalConfirmMarginMin: 5,
        minDwellMin: 0.5,
      };
      // m = 2.4 → まだ自駅DWELLING(effDep 2.5)
      expect(estimateEtaPhase(baseStops, anchor, min(0.4), options)).toEqual({
        kind: 'DWELLING',
        stationId: 2,
      });
      // m = 2.6 → 自駅は発車済み。マージン非加算のため次駅へ進める。
      expect(estimateEtaPhase(baseStops, anchor, min(0.6), options)).toEqual({
        kind: 'RUNNING',
        targetStationId: 3,
      });
    });
  });

  describe('最小停車時間の底上げ', () => {
    // 駅2は arr=3, dep=3(停車0分)。minDwell で 0.5 分の停車窓へ底上げされる。
    const stops: EtaFallbackStop[] = [
      { stationId: 1, cumulativeMinutes: 0, departureCumulativeMinutes: 0 },
      { stationId: 2, cumulativeMinutes: 3, departureCumulativeMinutes: 3 },
      { stationId: 3, cumulativeMinutes: 6, departureCumulativeMinutes: 6 },
    ];
    const anchor: EtaAnchor = {
      stationId: 1,
      kind: 'DEPARTED',
      observedAtMs: OBSERVED_AT_MS,
    };

    it('dep=arrでも effArr〜effArr+minDwell の停車窓ができる', () => {
      // effArr = 3.5、effDep = max(3, 3.5+0.5)=4.0。
      // m = 3.7 は底上げされた停車窓の内側。
      expect(estimateEtaPhase(stops, anchor, min(3.7), defaultOptions)).toEqual(
        {
          kind: 'DWELLING',
          stationId: 2,
        }
      );
      // m = 4.1 は effDep を過ぎ、次駅へ進む。
      expect(estimateEtaPhase(stops, anchor, min(4.1), defaultOptions)).toEqual(
        {
          kind: 'RUNNING',
          targetStationId: 3,
        }
      );
    });
  });

  describe('接近リードのclamp', () => {
    it('短区間ではリードが下限へclampされる', () => {
      // 駅間1.0分、生リード 1.0*0.4=0.4 → 下限 0.5 へclamp。
      // arr-lead = 1.0 - 0.5 = 0.5 が RUNNING/APPROACHING 境界。
      const stops: EtaFallbackStop[] = [
        { stationId: 1, cumulativeMinutes: 0, departureCumulativeMinutes: 0 },
        { stationId: 2, cumulativeMinutes: 1, departureCumulativeMinutes: 1.5 },
      ];
      const anchor: EtaAnchor = {
        stationId: 1,
        kind: 'DEPARTED',
        observedAtMs: OBSERVED_AT_MS,
      };
      // m = 0.4 (< 0.5) → RUNNING
      expect(estimateEtaPhase(stops, anchor, min(0.4), defaultOptions)).toEqual(
        {
          kind: 'RUNNING',
          targetStationId: 2,
        }
      );
      // m = 0.6 (>= 0.5) → APPROACHING。生リード0.4なら 0.6 はまだRUNNINGのはず。
      expect(estimateEtaPhase(stops, anchor, min(0.6), defaultOptions)).toEqual(
        {
          kind: 'APPROACHING',
          targetStationId: 2,
        }
      );
    });

    it('長区間ではリードが上限へclampされる', () => {
      // 駅間10分、生リード 10*0.4=4.0 → 上限 1.5 へclamp。
      // arr-lead = 10 - 1.5 = 8.5 が境界。
      const stops: EtaFallbackStop[] = [
        { stationId: 1, cumulativeMinutes: 0, departureCumulativeMinutes: 0 },
        { stationId: 2, cumulativeMinutes: 10, departureCumulativeMinutes: 10 },
      ];
      const anchor: EtaAnchor = {
        stationId: 1,
        kind: 'DEPARTED',
        observedAtMs: OBSERVED_AT_MS,
      };
      // m = 8.4 (< 8.5) → RUNNING。生リード4.0なら arr-lead=6.0 で APPROACHING のはず。
      expect(estimateEtaPhase(stops, anchor, min(8.4), defaultOptions)).toEqual(
        {
          kind: 'RUNNING',
          targetStationId: 2,
        }
      );
      // m = 8.6 (>= 8.5) → APPROACHING
      expect(estimateEtaPhase(stops, anchor, min(8.6), defaultOptions)).toEqual(
        {
          kind: 'APPROACHING',
          targetStationId: 2,
        }
      );
    });
  });

  describe('到着確定マージン(ARRIVING留め)', () => {
    it('マージンの間はarrを過ぎてもAPPROACHINGに留まる', () => {
      const options: EstimateEtaPhaseOptions = {
        arrivalConfirmMarginMin: 1,
        minDwellMin: 0.5,
      };
      const stops: EtaFallbackStop[] = [
        { stationId: 1, cumulativeMinutes: 0, departureCumulativeMinutes: 0 },
        { stationId: 2, cumulativeMinutes: 4, departureCumulativeMinutes: 4.5 },
      ];
      const anchor: EtaAnchor = {
        stationId: 1,
        kind: 'DEPARTED',
        observedAtMs: OBSERVED_AT_MS,
      };
      // effArr = 4 + 1 = 5.0。m = 4.5 は arr(4) を過ぎるがマージン内。
      expect(estimateEtaPhase(stops, anchor, min(4.5), options)).toEqual({
        kind: 'APPROACHING',
        targetStationId: 2,
      });
      // effDep = max(4.5, 5.0+0.5)=5.5。m = 5.2 で DWELLING。
      expect(estimateEtaPhase(stops, anchor, min(5.2), options)).toEqual({
        kind: 'DWELLING',
        stationId: 2,
      });
    });
  });

  describe('複数駅スキップ', () => {
    it('長時間経過で発車済みの駅を飛ばし先の駅のフェーズになる', () => {
      // m = 6.0 → 駅2(effDep 3.0)・駅3(effDep 5.5)を発車済み、駅4 arr-lead=6.2。
      const anchor: EtaAnchor = {
        stationId: 1,
        kind: 'DEPARTED',
        observedAtMs: OBSERVED_AT_MS,
      };
      expect(
        estimateEtaPhase(baseStops, anchor, min(6.0), defaultOptions)
      ).toEqual({ kind: 'RUNNING', targetStationId: 4 });
    });
  });

  describe('終端での停止', () => {
    it('大幅に超過しても終端駅のDWELLINGを返す(突き抜けない)', () => {
      const anchor: EtaAnchor = {
        stationId: 1,
        kind: 'DEPARTED',
        observedAtMs: OBSERVED_AT_MS,
      };
      expect(
        estimateEtaPhase(baseStops, anchor, min(100), defaultOptions)
      ).toEqual({ kind: 'DWELLING', stationId: 4 });
    });

    it('終端駅のDEPARTEDアンカーは終端DWELLINGを返す', () => {
      const anchor: EtaAnchor = {
        stationId: 4,
        kind: 'DEPARTED',
        observedAtMs: OBSERVED_AT_MS,
      };
      expect(
        estimateEtaPhase(baseStops, anchor, min(1), defaultOptions)
      ).toEqual({ kind: 'DWELLING', stationId: 4 });
    });
  });

  describe('発動不可のケース', () => {
    it('アンカー駅がstopsに無ければnull', () => {
      const anchor: EtaAnchor = {
        stationId: 999,
        kind: 'DEPARTED',
        observedAtMs: OBSERVED_AT_MS,
      };
      expect(
        estimateEtaPhase(baseStops, anchor, min(1), defaultOptions)
      ).toBeNull();
    });

    it('stopsが空配列ならnull', () => {
      const anchor: EtaAnchor = {
        stationId: 1,
        kind: 'DEPARTED',
        observedAtMs: OBSERVED_AT_MS,
      };
      expect(estimateEtaPhase([], anchor, min(1), defaultOptions)).toBeNull();
    });
  });

  describe('接近リード定数', () => {
    it('係数とclamp範囲が意図通り', () => {
      expect(APPROACH_LEAD_RATIO).toBe(0.4);
      expect(APPROACH_LEAD_MIN_MIN).toBe(0.5);
      expect(APPROACH_LEAD_MAX_MIN).toBe(1.5);
    });
  });
});

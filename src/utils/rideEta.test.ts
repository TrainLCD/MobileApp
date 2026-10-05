import { estimateRideEtaMinutes } from './rideEta';

const stops = [
  {
    stationId: 1,
    stationGroupId: 101,
    cumulativeMinutes: 0,
    departureCumulativeMinutes: 0.5,
  },
  {
    stationId: 2,
    stationGroupId: 102,
    cumulativeMinutes: 2,
    departureCumulativeMinutes: 2.5,
  },
  {
    stationId: 3,
    stationGroupId: 103,
    cumulativeMinutes: 4,
    departureCumulativeMinutes: 4,
  },
];

describe('estimateRideEtaMinutes', () => {
  it('出発駅は発車の時刻から数える', () => {
    expect(
      estimateRideEtaMinutes(
        stops,
        { stationId: 1, stationGroupId: 101, isOrigin: true },
        { stationId: 2, stationGroupId: 102 }
      )
    ).toBe(1.5);
  });

  it('出発駅でなければ到着の時刻から数え、停車時間を含める', () => {
    expect(
      estimateRideEtaMinutes(
        stops,
        { stationId: 2, stationGroupId: 102, isOrigin: false },
        { stationId: 3, stationGroupId: 103 }
      )
    ).toBe(2);
  });

  it('駅 ID が経路に無ければ駅グループで探す(接続駅の別の路線の駅)', () => {
    expect(
      estimateRideEtaMinutes(
        stops,
        { stationId: 1, stationGroupId: 101, isOrigin: true },
        { stationId: 99, stationGroupId: 102 }
      )
    ).toBe(1.5);
  });

  it('経路に無い駅、経路と逆向き、ETA が無いときは null', () => {
    const origin = { stationId: 1, stationGroupId: 101, isOrigin: true };
    expect(
      estimateRideEtaMinutes(stops, origin, {
        stationId: 99,
        stationGroupId: 199,
      })
    ).toBeNull();
    expect(
      estimateRideEtaMinutes(
        stops,
        { stationId: 3, stationGroupId: 103, isOrigin: false },
        { stationId: 2, stationGroupId: 102 }
      )
    ).toBeNull();
    expect(
      estimateRideEtaMinutes(null, origin, {
        stationId: 2,
        stationGroupId: 102,
      })
    ).toBeNull();
  });
});

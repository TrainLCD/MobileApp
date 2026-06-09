import type { Station } from '~/@types/graphql';
import { pickLiveActivityNextStation } from './useUpdateLiveActivities';

const makeStation = (id: number, groupId: number, name: string): Station =>
  ({
    id,
    groupId,
    name,
    nameRoman: name,
  }) as Station;

describe('pickLiveActivityNextStation', () => {
  const stopped = makeStation(1, 100, '日本橋');
  const gpsNext = makeStation(2, 200, '人形町');
  const recordNext = makeStation(3, 300, '東日本橋');

  it('通常時(右≠左)はGPS基準のdisplayNextStationをそのまま返す', () => {
    expect(pickLiveActivityNextStation(gpsNext, recordNext, stopped)).toBe(
      gpsNext
    );
  });

  it('右が停車駅と同一駅へcollapseしたら記録基準の次駅へフォールバックする', () => {
    // displayNextStation が停車駅(groupId 100)と同一駅へ collapse したケース
    const collapsedNext = makeStation(9, 100, '日本橋');
    expect(
      pickLiveActivityNextStation(collapsedNext, recordNext, stopped)
    ).toBe(recordNext);
  });

  it('displayNextStationが未定義ならそのまま未定義を返す(誤フォールバックしない)', () => {
    expect(
      pickLiveActivityNextStation(undefined, recordNext, stopped)
    ).toBeUndefined();
  });

  it('stoppedStationが未定義ならcollapse判定せずdisplayNextStationを返す', () => {
    expect(pickLiveActivityNextStation(gpsNext, recordNext, undefined)).toBe(
      gpsNext
    );
  });
});

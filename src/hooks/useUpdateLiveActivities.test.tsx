import type { Station } from '~/@types/graphql';
import { pickLiveActivityNextStation } from './useUpdateLiveActivities';

const makeStation = (
  id: number,
  groupId: number | null,
  name: string
): Station =>
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

  it('groupIdが両方nullの場合は同一駅扱いでcollapse判定されフォールバックする', () => {
    // groupId は GraphQL 上 Maybe<Int> のため null を取り得る。
    // null === null で collapse と判定される現挙動を明示する。
    const stoppedNullGroup = makeStation(1, null, '駅A');
    const displayNullGroup = makeStation(2, null, '駅B');
    expect(
      pickLiveActivityNextStation(displayNullGroup, recordNext, stoppedNullGroup)
    ).toBe(recordNext);
  });
});

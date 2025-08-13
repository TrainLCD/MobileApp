import {
  AMAGASAKI_STATIONS_FROM_SEARCH,
  OCHIAI_STATIONS_FROM_SEARCH,
} from './__fixtures__/search';
import { groupStations } from './groupStations';

describe('useStationGrouping', () => {
  it('should be empty array', () => {
    expect(groupStations([])).toEqual([]);
  });
  it('should be grouped by company', () => {
    const result = groupStations(AMAGASAKI_STATIONS_FROM_SEARCH);
    expect(result.length).toBe(3);

    expect(result[0]?.name).toBe('尼崎(JR西日本)');
    expect(result[0]?.nameRoman).toBe('Amagasaki(JR West)');

    expect(result[1]?.name).toBe('尼崎(阪神)');
    expect(result[1]?.nameRoman).toBe('Amagasaki(Hanshin)');

    expect(result[2]?.name).toBe('尼崎センタープール前');
    expect(result[2]?.nameRoman).toBe('Amagasaki-Centerpool-Mae');
  });
  it('should be grouped by prefecture', () => {
    const result = groupStations(OCHIAI_STATIONS_FROM_SEARCH);
    expect(result.length).toBe(8);

    expect(result[0]?.name).toBe('落合(北海道)');
    expect(result[0]?.nameRoman).toBe('Ochiai(Hokkaido)');

    expect(result[1]?.name).toBe('陸前落合');
    expect(result[1]?.nameRoman).toBe('Rikuzen-Ochiai');

    expect(result[2]?.name).toBe('落合川');
    expect(result[2]?.nameRoman).toBe('Ochiaigawa');

    expect(result[3]?.name).toBe('美作落合');
    expect(result[3]?.nameRoman).toBe('Mimasaka-Ochiai');

    expect(result[4]?.name).toBe('備後落合');
    expect(result[4]?.nameRoman).toBe('Bingo-Ochiai');

    expect(result[5]?.name).toBe('下落合');
    expect(result[5]?.nameRoman).toBe('Shimo-Ochiai');

    expect(result[6]?.name).toBe('落合(東京都)');
    expect(result[6]?.nameRoman).toBe('Ochiai(Tokyo)');

    expect(result[7]?.name).toBe('落合南長崎');
    expect(result[7]?.nameRoman).toBe('Ochiai-minami-nagasaki');
  });
});

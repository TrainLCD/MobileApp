import type { Station } from '~/@types/graphql';
import { getWidgetStationNumber } from './widgetStationNumber';

const station = (overrides: Partial<Station>): Station => overrides as Station;

describe('getWidgetStationNumber', () => {
  it.each([undefined, station({}), station({ stationNumbers: [] })])(
    '番号がない駅では代替番号を作らず空欄にする: %p',
    (value) => expect(getWidgetStationNumber(value)).toBe('')
  );

  it('番号一覧の順番によらず駅自身の路線に対応する番号を選ぶ', () => {
    expect(
      getWidgetStationNumber(
        station({
          line: { lineSymbols: [{ symbol: 'JY' }] },
          stationNumbers: [
            { lineSymbol: 'JC', stationNumber: 'JC-05' },
            { lineSymbol: 'JY', stationNumber: 'JY-17' },
          ],
        } as Partial<Station>)
      )
    ).toBe('JY-17');
  });

  it.each([
    ['E38', 'E-38'],
    ['JY17', 'JY-17'],
    [' E-38 ', 'E-38'],
    ['01', '01'],
  ])('%sを%sとして表示する', (input, output) => {
    expect(
      getWidgetStationNumber(
        station({
          stationNumbers: [{ stationNumber: input }],
        } as Partial<Station>)
      )
    ).toBe(output);
  });

  it('対応する路線記号がない場合は既存の番号選択と同じく先頭を使う', () => {
    expect(
      getWidgetStationNumber(
        station({
          line: { lineSymbols: [{ symbol: 'E' }] },
          stationNumbers: [{ lineSymbol: 'JY', stationNumber: 'JY-17' }],
        } as Partial<Station>)
      )
    ).toBe('JY-17');
  });
});

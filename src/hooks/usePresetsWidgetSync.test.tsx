import { renderHook } from '@testing-library/react-native';
import type { Station } from '~/@types/graphql';
import type { SavedRoute } from '~/models/SavedRoute';
import type { LoopItem } from '~/store/atoms/navigation';
import { isJapanese } from '~/translation';
import { updatePresetsWidget } from '~/utils/native/presetsWidget';
import {
  MAX_PRESETS_WIDGET_ITEMS,
  usePresetsWidgetSync,
} from './usePresetsWidgetSync';

jest.mock('~/utils/native/presetsWidget', () => ({
  updatePresetsWidget: jest.fn(),
}));

const mockUpdatePresetsWidget = updatePresetsWidget as jest.MockedFunction<
  typeof updatePresetsWidget
>;

const createStation = (
  groupId: number,
  name: string,
  nameRoman: string,
  overrides: Partial<Station> = {}
): Station =>
  ({
    id: groupId,
    groupId,
    name,
    nameRoman,
    ...overrides,
  }) as Station;

const line = {
  id: 11302,
  color: '#80C241',
  nameShort: '山手線',
  nameRoman: 'Yamanote Line',
};

const createLoopItem = (overrides: Partial<LoopItem> = {}): LoopItem =>
  ({
    id: '11111111-1111-4111-8111-111111111111',
    name: '通勤',
    lineId: line.id,
    trainTypeId: null,
    wantedDestinationId: null,
    direction: null,
    notifyStationIds: [],
    hasTrainType: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    __k: 'key-0',
    stations: [
      createStation(1, '東京', 'Tokyo', {
        line,
        stationNumbers: [{ lineSymbol: 'JY' }],
      } as Partial<Station>),
      createStation(2, '新宿', 'Shinjuku', { line } as Partial<Station>),
    ],
    ...overrides,
  }) as LoopItem;

const createRoute = (id: string): SavedRoute =>
  ({ id, name: '通勤' }) as SavedRoute;

afterEach(() => {
  jest.clearAllMocks();
});

describe('usePresetsWidgetSync', () => {
  it('取得済みのプリセットを表示用の文字列へ変換して同期する', () => {
    const item = createLoopItem();
    renderHook(() =>
      usePresetsWidgetSync({
        carouselData: [item],
        routes: [createRoute(item.id)],
        isRoutesDBInitialized: true,
      })
    );

    // 表示言語は端末設定に追従するため、期待値も同じ基準で組み立てる
    expect(mockUpdatePresetsWidget).toHaveBeenCalledWith([
      {
        id: item.id,
        name: '通勤',
        fromStationName: isJapanese ? '東京' : 'Tokyo',
        toStationName: isJapanese ? '新宿' : 'Shinjuku',
        lineName: isJapanese ? '山手線' : 'Yamanote Line',
        lineColor: '#80C241',
        lineSymbol: 'JY',
      },
    ]);
  });

  it('DB未初期化の間は同期しない', () => {
    const item = createLoopItem();
    renderHook(() =>
      usePresetsWidgetSync({
        carouselData: [item],
        routes: [createRoute(item.id)],
        isRoutesDBInitialized: false,
      })
    );

    expect(mockUpdatePresetsWidget).not.toHaveBeenCalled();
  });

  it('駅情報の取得待ちで一時的に空になっている間は同期しない', () => {
    renderHook(() =>
      usePresetsWidgetSync({
        carouselData: [],
        routes: [createRoute('11111111-1111-4111-8111-111111111111')],
        isRoutesDBInitialized: true,
      })
    );

    expect(mockUpdatePresetsWidget).not.toHaveBeenCalled();
  });

  it('プリセットが0件になった場合は空配列を同期する', () => {
    renderHook(() =>
      usePresetsWidgetSync({
        carouselData: [],
        routes: [],
        isRoutesDBInitialized: true,
      })
    );

    expect(mockUpdatePresetsWidget).toHaveBeenCalledWith([]);
  });

  it('表示内容が変わらない再レンダーでは同期し直さない', () => {
    const item = createLoopItem();
    const { rerender } = renderHook(
      (props: { carouselData: LoopItem[] }) =>
        usePresetsWidgetSync({
          carouselData: props.carouselData,
          routes: [createRoute(item.id)],
          isRoutesDBInitialized: true,
        }),
      { initialProps: { carouselData: [item] } }
    );

    // 参照が変わっても内容が同じならネイティブへ書き込まない
    rerender({ carouselData: [{ ...item, __k: 'key-1' }] });

    expect(mockUpdatePresetsWidget).toHaveBeenCalledTimes(1);
  });

  it('上限を超えたプリセットは切り詰めて同期する', () => {
    const carouselData = Array.from(
      { length: MAX_PRESETS_WIDGET_ITEMS + 3 },
      (_, i) => createLoopItem({ id: `id-${i}`, __k: `key-${i}` })
    );
    renderHook(() =>
      usePresetsWidgetSync({
        carouselData,
        routes: carouselData.map((item) => createRoute(item.id)),
        isRoutesDBInitialized: true,
      })
    );

    expect(mockUpdatePresetsWidget.mock.calls[0][0]).toHaveLength(
      MAX_PRESETS_WIDGET_ITEMS
    );
  });

  // 駅一覧の並びが保存時と反転して返るケース。
  // direction をそのまま当てると始発駅と行き先が同じ駅になってしまう
  it('駅一覧の並びが保存時と反転していても始発駅と行き先が同じにならない', () => {
    const item = createLoopItem({
      wantedDestinationId: 2,
      direction: 'OUTBOUND',
      stations: [
        createStation(1, '前橋', 'Maebashi', { line } as Partial<Station>),
        createStation(2, '小田原', 'Odawara', { line } as Partial<Station>),
      ],
    });
    renderHook(() =>
      usePresetsWidgetSync({
        carouselData: [item],
        routes: [createRoute(item.id)],
        isRoutesDBInitialized: true,
      })
    );

    const synced = mockUpdatePresetsWidget.mock.calls[0][0][0];
    expect(synced.fromStationName).toBe(isJapanese ? '前橋' : 'Maebashi');
    expect(synced.toStationName).toBe(isJapanese ? '小田原' : 'Odawara');
  });

  it('路線記号が無い場合は空文字を渡してネイティブ側のフォールバックに委ねる', () => {
    const item = createLoopItem({
      stations: [
        createStation(1, '東京', 'Tokyo', { line } as Partial<Station>),
        createStation(2, '新宿', 'Shinjuku', { line } as Partial<Station>),
      ],
    });
    renderHook(() =>
      usePresetsWidgetSync({
        carouselData: [item],
        routes: [createRoute(item.id)],
        isRoutesDBInitialized: true,
      })
    );

    expect(mockUpdatePresetsWidget.mock.calls[0][0][0].lineSymbol).toBe('');
  });
});

import { act, fireEvent, render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Dimensions, Keyboard, StyleSheet } from 'react-native';
import type { Line, Station, TrainType } from '~/@types/graphql';
import { LIGHT_APP_COLORS } from '~/constants/colorScheme';
import { useLazyGraphQLQuery } from '~/hooks/useLazyGraphQLQuery';
import { GET_CONNECTED_ROUTES_SORTED } from '~/lib/graphql/queries';
import { appColorsAtom } from '~/store/atoms/colorScheme';
import { fetchedTrainTypesAtom } from '~/store/atoms/navigation';
import {
  type ConnectedRoutesSource,
  connectedRoutesSourceAtom,
} from '~/store/atoms/routeSearch';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { buildRouteTrainTypes, type ConnectedRoute } from '~/utils/routeSearch';
import { TrainTypeListModal } from './TrainTypeListModal';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

// ~/lib/gql は読み込み時に API の URL(.env.local)を検査する。CI には .env.local が無いので
// 実物を読み込まない
jest.mock('~/hooks/useLazyGraphQLQuery', () => ({
  useLazyGraphQLQuery: jest.fn(),
}));

// FlashList はセルを使い回すので、描画ツリー上の順が表示順と一致しない。
// 並び順を確かめるため、データの順に描く FlatList に置き換える
jest.mock('@shopify/flash-list', () => ({
  FlashList: require('react-native').FlatList,
}));

jest.mock('@gorhom/portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children,
}));

// モーダルの寸法は props にしか現れないので、素通しにしたうえで受け取った値を控える
const mockCustomModal = jest.fn();
jest.mock('./CustomModal', () => ({
  CustomModal: (props: { children?: React.ReactNode }) => {
    mockCustomModal(props);
    return props.children ?? null;
  },
}));

jest.mock('~/translation', () => ({
  isJapanese: true,
  translate: jest.fn((key: string) => key),
}));

// 絞り込みの結果だけを見たいので、カードは見出しだけの入れ物に置き換える
jest.mock('./CommonCard', () => {
  const { Text } = require('react-native');
  const ReactModule = require('react');
  return {
    CommonCard: ({ title }: { title?: string }) =>
      ReactModule.createElement(Text, { testID: 'trainTypeCard' }, title),
  };
});

const toyoko = { id: 1, nameShort: '東急東横線', nameRoman: 'Toyoko' } as Line;
const fukutoshin = {
  id: 2,
  nameShort: '東京メトロ副都心線',
  nameRoman: 'Fukutoshin',
} as Line;
const tojo = { id: 3, nameShort: '東武東上線', nameRoman: 'Tojo' } as Line;
const minatomirai = {
  id: 4,
  nameShort: 'みなとみらい線',
  nameRoman: 'Minatomirai',
} as Line;

const createTrainType = (id: number, name: string, lines: Line[]): TrainType =>
  ({
    id,
    typeId: id,
    groupId: id,
    name,
    nameRoman: name,
    lines,
  }) as unknown as TrainType;

const ALL_TRAIN_TYPES = [
  createTrainType(1, '各駅停車', [toyoko, minatomirai]),
  createTrainType(2, '各駅停車', [toyoko, fukutoshin]),
  createTrainType(3, '急行', [toyoko, minatomirai]),
  createTrainType(4, '急行', [toyoko, fukutoshin, tojo]),
  createTrainType(5, '通勤特急', [toyoko, minatomirai]),
  createTrainType(6, '通勤特急', [toyoko, fukutoshin, tojo]),
  createTrainType(7, '特急', [toyoko, minatomirai]),
  createTrainType(8, '特急', [toyoko, fukutoshin, tojo]),
];

const mockAtoms = (
  trainTypes: TrainType[],
  routesSource: ConnectedRoutesSource | null = null
) => {
  (useAtomValue as jest.Mock).mockImplementation((atom: unknown) => {
    if (atom === fetchedTrainTypesAtom) return trainTypes;
    if (atom === connectedRoutesSourceAtom) return routesSource;
    if (atom === appColorsAtom) return LIGHT_APP_COLORS;
    if (atom === isLEDThemeAtom) return false;
    return undefined;
  });
};

const mockFetchSortedRoutes = jest.fn();

const setup = (trainTypes: TrainType[] = ALL_TRAIN_TYPES) => {
  mockAtoms(trainTypes);
  return render(
    <TrainTypeListModal
      visible
      line={toyoko}
      onClose={jest.fn()}
      onSelect={jest.fn()}
    />
  );
};

type KeyboardListener = (event: { endCoordinates: { height: number } }) => void;

const keyboardListeners: { event: string; handler: KeyboardListener }[] = [];

beforeEach(() => {
  (useLazyGraphQLQuery as jest.Mock).mockImplementation((document) => {
    if (document !== GET_CONNECTED_ROUTES_SORTED) {
      throw new Error('unexpected query');
    }
    return [mockFetchSortedRoutes, {}];
  });
  keyboardListeners.length = 0;
  // KeyboardEvent 全体を作らずに endCoordinates だけ流したいので、実装ごと差し替える
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((
    event: string,
    handler: KeyboardListener
  ) => {
    keyboardListeners.push({ event, handler });
    return { remove: jest.fn() };
  }) as unknown as typeof Keyboard.addListener);
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

const lastModalStyle = () => {
  const props = mockCustomModal.mock.calls.at(-1)?.[0];
  return {
    content: StyleSheet.flatten(props?.contentContainerStyle) as {
      height?: number;
      maxHeight?: number | string;
    },
    container: StyleSheet.flatten(props?.containerStyle) as {
      paddingBottom?: number;
    },
  };
};

/** show 側（先に登録される方）のリスナーにキーボードのせり上がりを流す */
const showKeyboard = (height: number) => {
  const listener = keyboardListeners[0];
  act(() => listener?.handler({ endCoordinates: { height } }));
};

const hideKeyboard = () => {
  const listener = keyboardListeners[1];
  act(() => listener?.handler({ endCoordinates: { height: 0 } }));
};

describe('TrainTypeListModal - 絞り込み', () => {
  it('種別が少ない駅では絞り込みを出さない', () => {
    const { queryByTestId, getAllByTestId } = setup(
      ALL_TRAIN_TYPES.slice(0, 5)
    );

    expect(queryByTestId('trainTypeFilterSearchInput')).toBeNull();
    expect(getAllByTestId('trainTypeCard')).toHaveLength(5);
  });

  it('種別が多い駅では絞り込みを出す', () => {
    const { getByTestId, getAllByTestId } = setup();

    expect(getByTestId('trainTypeFilterSearchInput')).toBeTruthy();
    expect(getByTestId('trainTypeFilterAxis-typeNames')).toBeTruthy();
    expect(getByTestId('trainTypeFilterAxis-lines')).toBeTruthy();
    expect(getAllByTestId('trainTypeCard')).toHaveLength(8);
  });

  it('路線で絞ると直通する種別だけが残る', () => {
    const { getByTestId, getAllByTestId } = setup();

    fireEvent.press(getByTestId('trainTypeFilterAxis-lines'));
    fireEvent.press(getByTestId('trainTypeFilterValue-3'));

    expect(getAllByTestId('trainTypeCard')).toHaveLength(3);
  });

  it('種別と路線を掛け合わせると絞り込みは AND で効く', () => {
    const { getByTestId, getAllByTestId } = setup();

    fireEvent.press(getByTestId('trainTypeFilterAxis-lines'));
    fireEvent.press(getByTestId('trainTypeFilterValue-3'));
    fireEvent.press(getByTestId('trainTypeFilterAxis-typeNames'));
    fireEvent.press(getByTestId('trainTypeFilterValue-特急'));

    const cards = getAllByTestId('trainTypeCard');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('特急');
  });

  it('フリーワードでも一覧が絞られる', () => {
    const { getByTestId, getAllByTestId } = setup();

    fireEvent.changeText(getByTestId('trainTypeFilterSearchInput'), '東上');

    expect(getAllByTestId('trainTypeCard')).toHaveLength(3);
  });

  it('一致しないときは空表示になり、条件をクリアすると戻る', () => {
    const { getByTestId, getByText, queryAllByTestId, getAllByTestId } =
      setup();

    fireEvent.changeText(
      getByTestId('trainTypeFilterSearchInput'),
      '存在しない種別'
    );

    expect(queryAllByTestId('trainTypeCard')).toHaveLength(0);
    expect(getByText('trainTypeListEmpty')).toBeTruthy();

    fireEvent.press(getByText('trainTypeFilterClearAll'));

    expect(getAllByTestId('trainTypeCard')).toHaveLength(8);
  });

  it('閉じると絞り込み条件は捨てられる', () => {
    mockAtoms(ALL_TRAIN_TYPES);
    const props = {
      line: toyoko,
      onClose: jest.fn(),
      onSelect: jest.fn(),
    };
    const { getByTestId, getAllByTestId, rerender } = render(
      <TrainTypeListModal visible {...props} />
    );

    fireEvent.changeText(getByTestId('trainTypeFilterSearchInput'), '東上');
    expect(getAllByTestId('trainTypeCard')).toHaveLength(3);

    rerender(<TrainTypeListModal visible={false} {...props} />);
    rerender(<TrainTypeListModal visible {...props} />);

    expect(getAllByTestId('trainTypeCard')).toHaveLength(8);
  });
});

describe('TrainTypeListModal - キーボード回避', () => {
  it('絞り込みを出さない駅ではキーボードを購読しない', () => {
    setup(ALL_TRAIN_TYPES.slice(0, 5));

    expect(keyboardListeners).toHaveLength(0);
  });

  it('キーボードが出るとモーダルを可視領域に収める', () => {
    setup();

    const before = lastModalStyle();
    expect(before.container.paddingBottom).toBeUndefined();

    // 一覧の高さより大きくせり上がらせないと、上限そのものが効いているか見えない
    showKeyboard(500);

    const after = lastModalStyle();
    expect(after.content.height).toBeLessThan(before.content.height as number);
    expect(after.content.height).toBe(
      Dimensions.get('window').height - 500 - 24 * 2
    );
    expect(after.container.paddingBottom).toBe(500 + 24);
    // 既定の maxHeight('75%') はキーボードで縮んだ領域にも掛かってしまうので外す
    expect(after.content.maxHeight).toBe('100%');
  });

  it('キーボードが下りると元の寸法に戻る', () => {
    setup();

    const before = lastModalStyle();

    showKeyboard(500);
    hideKeyboard();

    const after = lastModalStyle();
    expect(after.content.height).toBe(before.content.height);
    expect(after.container.paddingBottom).toBeUndefined();
    expect(after.content.maxHeight).toBeUndefined();
  });
});

describe('TrainTypeListModal - 並べ替え', () => {
  const directRoute = (trainTypes: TrainType[]): ConnectedRoute => ({
    legs: [{ trainTypes }],
  });
  const station = (id: number, line: Line) =>
    ({ id, groupId: id, name: `駅${id}`, line }) as unknown as Station;
  // 東横線 → 副都心線の乗換。種別一覧では 1 行になる
  const transferRoute: ConnectedRoute = {
    legs: [
      {
        trainTypes: [createTrainType(9, '乗換', [toyoko])],
        fromStation: station(101, toyoko),
        toStation: station(102, toyoko),
      },
      {
        trainTypes: [createTrainType(10, '各駅停車', [fukutoshin])],
        fromStation: station(201, fukutoshin),
        toStation: station(202, fukutoshin),
      },
    ],
  };
  const localRoute = directRoute(ALL_TRAIN_TYPES.slice(0, 4));
  const expressRoute = directRoute(ALL_TRAIN_TYPES.slice(4, 8));
  const routes = [localRoute, expressRoute, transferRoute];
  const { trainTypes } = buildRouteTrainTypes(routes);
  const source: ConnectedRoutesSource = {
    trainTypes,
    routes,
    variables: { fromStationGroupId: 1, toStationGroupId: 2, viaLineId: 1 },
  };
  // API から取り直した経路は別のオブジェクトになる
  const refetched = (route: ConnectedRoute): ConnectedRoute =>
    JSON.parse(JSON.stringify(route));

  const setupSortable = () => {
    mockAtoms(trainTypes, source);
    const props = {
      line: toyoko,
      onClose: jest.fn(),
      onSelect: jest.fn(),
    };
    const utils = render(<TrainTypeListModal visible {...props} />);
    return { ...utils, props };
  };

  const cardTitles = (cards: { props: { children?: unknown } }[]) =>
    cards.map((card) => card.props.children);

  const selectSort = async (
    getByTestId: (id: string) => unknown,
    value: string
  ) => {
    fireEvent.press(getByTestId('trainTypeFilterAxis-sort') as never);
    await act(async () => {
      fireEvent.press(getByTestId(`trainTypeSortValue-${value}`) as never);
    });
  };

  it('駅の種別一覧では並べ替えを出さない', () => {
    const { queryByTestId } = setup();

    expect(queryByTestId('trainTypeFilterAxis-sort')).toBeNull();
  });

  it('経路検索の結果は件数が少なくても絞り込み欄と並べ替えを出す', () => {
    const fewRoutes = [directRoute(ALL_TRAIN_TYPES.slice(0, 2)), transferRoute];
    const few = buildRouteTrainTypes(fewRoutes).trainTypes;
    mockAtoms(few, {
      trainTypes: few,
      routes: fewRoutes,
      variables: source.variables,
    });
    const { getByTestId, getAllByTestId } = render(
      <TrainTypeListModal
        visible
        line={toyoko}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    expect(getAllByTestId('trainTypeCard')).toHaveLength(3);
    expect(getByTestId('trainTypeFilterSearchInput')).toBeTruthy();
    expect(getByTestId('trainTypeFilterAxis-sort')).toBeTruthy();
  });

  it('経路の記録が今の種別一覧のものでなければ並べ替えを出さない', () => {
    // 経路検索のあとで駅の種別一覧に書き換わった
    mockAtoms(ALL_TRAIN_TYPES, source);
    const { queryByTestId } = render(
      <TrainTypeListModal
        visible
        line={toyoko}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    expect(queryByTestId('trainTypeFilterAxis-sort')).toBeNull();
  });

  it('並び順を選ぶと経路を取り直し、その順に種別を並べる', async () => {
    mockFetchSortedRoutes.mockResolvedValue({
      data: {
        connectedRoutes: [
          refetched(transferRoute),
          refetched(expressRoute),
          refetched(localRoute),
        ],
      },
      error: undefined,
    });
    const { getByTestId, getAllByTestId } = setupSortable();

    expect(cardTitles(getAllByTestId('trainTypeCard'))).toEqual([
      '各駅停車',
      '各駅停車',
      '急行',
      '急行',
      '通勤特急',
      '通勤特急',
      '特急',
      '特急',
      '乗換',
    ]);

    await selectSort(getByTestId, 'ArrivalTime');

    expect(mockFetchSortedRoutes).toHaveBeenCalledWith({
      variables: { ...source.variables, sortBy: 'ArrivalTime' },
    });
    expect(cardTitles(getAllByTestId('trainTypeCard'))).toEqual([
      '乗換',
      '通勤特急',
      '通勤特急',
      '特急',
      '特急',
      '各駅停車',
      '各駅停車',
      '急行',
      '急行',
    ]);
  });

  it('おすすめ順に戻すと取り直さずに元の並びに戻る', async () => {
    mockFetchSortedRoutes.mockResolvedValue({
      data: {
        connectedRoutes: [refetched(transferRoute), refetched(localRoute)],
      },
      error: undefined,
    });
    const { getByTestId, getAllByTestId } = setupSortable();

    await selectSort(getByTestId, 'TransferCount');
    await selectSort(getByTestId, 'Recommended');

    expect(mockFetchSortedRoutes).toHaveBeenCalledTimes(1);
    expect(cardTitles(getAllByTestId('trainTypeCard'))[0]).toBe('各駅停車');
  });

  it('取り直しに失敗したらおすすめ順のまま、並べ替えられなかったことを出す', async () => {
    mockFetchSortedRoutes.mockResolvedValue({
      data: undefined,
      error: new Error('Unknown type ConnectedRouteSort'),
    });
    const { getByTestId, getByText, getAllByTestId } = setupSortable();

    await selectSort(getByTestId, 'ArrivalTime');

    expect(getByText('trainTypeSortError')).toBeTruthy();
    expect(getByText('trainTypeSortRecommended')).toBeTruthy();
    expect(cardTitles(getAllByTestId('trainTypeCard'))[0]).toBe('各駅停車');
  });

  it('先に選んだ並び順の結果が後から届いても、後で選んだ並び順のまま', async () => {
    let resolveArrival: (value: unknown) => void = () => {};
    mockFetchSortedRoutes
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveArrival = resolve;
          })
      )
      .mockResolvedValueOnce({
        data: {
          connectedRoutes: [refetched(transferRoute), refetched(localRoute)],
        },
        error: undefined,
      });
    const { getByTestId, getAllByTestId } = setupSortable();

    await selectSort(getByTestId, 'ArrivalTime');
    await selectSort(getByTestId, 'TransferCount');
    await act(async () => {
      resolveArrival({
        data: { connectedRoutes: [refetched(expressRoute)] },
        error: undefined,
      });
    });

    expect(getByTestId('trainTypeFilterAxis-sort')).toHaveTextContent(
      /trainTypeSortTransferCount/
    );
    expect(cardTitles(getAllByTestId('trainTypeCard'))[0]).toBe('乗換');
  });

  it('閉じると並び順はおすすめ順に戻る', async () => {
    mockFetchSortedRoutes.mockResolvedValue({
      data: {
        connectedRoutes: [refetched(transferRoute), refetched(localRoute)],
      },
      error: undefined,
    });
    const { getByTestId, getAllByTestId, rerender, props } = setupSortable();

    await selectSort(getByTestId, 'TransferCount');
    expect(cardTitles(getAllByTestId('trainTypeCard'))[0]).toBe('乗換');

    rerender(<TrainTypeListModal visible={false} {...props} />);
    rerender(<TrainTypeListModal visible {...props} />);

    expect(cardTitles(getAllByTestId('trainTypeCard'))[0]).toBe('各駅停車');
  });
});

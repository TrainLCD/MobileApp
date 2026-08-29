import { act, fireEvent, render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Dimensions, Keyboard, StyleSheet } from 'react-native';
import type { Line, TrainType } from '~/@types/graphql';
import { LIGHT_APP_COLORS } from '~/constants/colorScheme';
import { appColorsAtom } from '~/store/atoms/colorScheme';
import { fetchedTrainTypesAtom } from '~/store/atoms/navigation';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { TrainTypeListModal } from './TrainTypeListModal';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
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

const mockAtoms = (trainTypes: TrainType[]) => {
  (useAtomValue as jest.Mock).mockImplementation((atom: unknown) => {
    if (atom === fetchedTrainTypesAtom) return trainTypes;
    if (atom === appColorsAtom) return LIGHT_APP_COLORS;
    if (atom === isLEDThemeAtom) return false;
    return undefined;
  });
};

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

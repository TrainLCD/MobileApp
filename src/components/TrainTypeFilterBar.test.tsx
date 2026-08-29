import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import {
  EMPTY_TRAIN_TYPE_FILTER,
  type TrainTypeFilterOptions,
  type TrainTypeFilterState,
} from '~/utils/trainTypeFilter';
import { TrainTypeFilterBar } from './TrainTypeFilterBar';

jest.mock('~/translation', () => ({
  isJapanese: true,
  translate: jest.fn((key: string) => key),
}));

afterEach(() => jest.clearAllMocks());

const options: TrainTypeFilterOptions = {
  typeNames: [
    { value: '各駅停車', label: '各駅停車' },
    { value: '急行', label: '急行' },
    { value: '特急', label: '特急' },
  ],
  lines: [
    { value: 2, label: '東京メトロ副都心線' },
    { value: 3, label: '東武東上線' },
  ],
};

const setup = (filter: TrainTypeFilterState = EMPTY_TRAIN_TYPE_FILTER) => {
  const onChange = jest.fn();
  const utils = render(
    <TrainTypeFilterBar options={options} filter={filter} onChange={onChange} />
  );
  return { ...utils, onChange };
};

describe('TrainTypeFilterBar', () => {
  it('軸チップは既定では閉じていて、選択肢は出ていない', () => {
    const { queryByText } = setup();

    expect(queryByText('急行')).toBeNull();
    expect(queryByText('東武東上線')).toBeNull();
  });

  it('軸チップをタップすると選択肢が開く', () => {
    const { getByTestId, getByText } = setup();

    fireEvent.press(getByTestId('trainTypeFilterAxis-lines'));

    expect(getByText('trainTypeFilterLineHeading')).toBeTruthy();
    expect(getByText('東武東上線')).toBeTruthy();
  });

  it('同時に開くのはひとつの軸だけ', () => {
    const { getByTestId, getByText, queryByText } = setup();

    fireEvent.press(getByTestId('trainTypeFilterAxis-lines'));
    fireEvent.press(getByTestId('trainTypeFilterAxis-typeNames'));

    expect(getByText('急行')).toBeTruthy();
    expect(queryByText('東武東上線')).toBeNull();
  });

  it('開いている軸をもう一度タップすると閉じる', () => {
    const { getByTestId, queryByText } = setup();

    fireEvent.press(getByTestId('trainTypeFilterAxis-typeNames'));
    fireEvent.press(getByTestId('trainTypeFilterAxis-typeNames'));

    expect(queryByText('急行')).toBeNull();
  });

  it('選択肢をタップすると条件に足される', () => {
    const { getByTestId, getByText, onChange } = setup();

    fireEvent.press(getByTestId('trainTypeFilterAxis-lines'));
    fireEvent.press(getByText('東武東上線'));

    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_TRAIN_TYPE_FILTER,
      lineIds: [3],
    });
  });

  it('選択済みの選択肢をタップすると条件から外れる', () => {
    const { getByTestId, getByText, onChange } = setup({
      ...EMPTY_TRAIN_TYPE_FILTER,
      lineIds: [2, 3],
    });

    fireEvent.press(getByTestId('trainTypeFilterAxis-lines'));
    fireEvent.press(getByText('東京メトロ副都心線'));

    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_TRAIN_TYPE_FILTER,
      lineIds: [3],
    });
  });

  it('軸の「すべて解除」はその軸だけを空にする', () => {
    const { getByTestId, getByText, onChange } = setup({
      query: '急行',
      typeNames: ['急行'],
      lineIds: [3],
    });

    fireEvent.press(getByTestId('trainTypeFilterAxis-lines'));
    fireEvent.press(getByText('trainTypeFilterResetAxis'));

    expect(onChange).toHaveBeenCalledWith({
      query: '急行',
      typeNames: ['急行'],
      lineIds: [],
    });
  });

  it('選択中の軸には件数バッジが出る', () => {
    const { getByText } = setup({
      ...EMPTY_TRAIN_TYPE_FILTER,
      typeNames: ['急行', '特急'],
    });

    expect(getByText('2')).toBeTruthy();
  });

  it('クリアは条件が空のときは出ない', () => {
    const { queryByTestId } = setup();

    expect(queryByTestId('trainTypeFilterClear')).toBeNull();
  });

  it('クリアはすべての条件を捨てる', () => {
    const { getByTestId, onChange } = setup({
      query: '東上',
      typeNames: ['急行'],
      lineIds: [3],
    });

    fireEvent.press(getByTestId('trainTypeFilterClear'));

    expect(onChange).toHaveBeenCalledWith(EMPTY_TRAIN_TYPE_FILTER);
  });

  it('フリーワードの入力が条件に反映される', () => {
    const { getByTestId, onChange } = setup();

    fireEvent.changeText(getByTestId('trainTypeFilterSearchInput'), '東上');

    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_TRAIN_TYPE_FILTER,
      query: '東上',
    });
  });

  // iOS は autoCorrect={false}(autocorrectionType = .no) にすると日本語入力の
  // 変換候補バーごと消え、かなを漢字へ変換できなくなる。Android でも
  // TYPE_TEXT_FLAG_NO_SUGGESTIONS が立って候補が出なくなる。
  // 省略して既定に委ねると、New Architecture のビュー再利用で .no が残った
  // ビューを引き継ぐことがあるため、true を明示することまで含めて固定する
  it('日本語入力の変換候補を潰さないよう、入力欄のオートコレクトを明示的に有効化する', () => {
    const { getByTestId } = setup();

    expect(getByTestId('trainTypeFilterSearchInput').props.autoCorrect).toBe(
      true
    );
  });

  it('入力があるときだけ入力欄のクリアが出る', () => {
    const { queryByTestId } = setup();
    expect(queryByTestId('trainTypeFilterClearQuery')).toBeNull();

    const { getByTestId, onChange } = setup({
      ...EMPTY_TRAIN_TYPE_FILTER,
      query: '東上',
    });
    fireEvent.press(getByTestId('trainTypeFilterClearQuery'));

    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_TRAIN_TYPE_FILTER,
      query: '',
    });
  });

  it('選択肢がひとつしかない軸のチップは出さない', () => {
    const onChange = jest.fn();
    const { queryByTestId } = render(
      <TrainTypeFilterBar
        options={{ typeNames: options.typeNames, lines: [options.lines[0]] }}
        filter={EMPTY_TRAIN_TYPE_FILTER}
        onChange={onChange}
      />
    );

    expect(queryByTestId('trainTypeFilterAxis-typeNames')).toBeTruthy();
    expect(queryByTestId('trainTypeFilterAxis-lines')).toBeNull();
  });
  // 入力欄のクリアボタンは入力欄が自分で空にするため、ここで作り直すと
  // 焦点と IME セッションが切れる。外からのクリアだけ作り直す
  it('入力欄内のクリアでは入力欄を作り直さず、外からのクリアでのみ作り直す', () => {
    const Harness = () => {
      const [filter, setFilter] = useState<TrainTypeFilterState>(
        EMPTY_TRAIN_TYPE_FILTER
      );
      return (
        <>
          <TrainTypeFilterBar
            options={options}
            filter={filter}
            onChange={setFilter}
          />
          <Text
            testID="externalClear"
            onPress={() => setFilter(EMPTY_TRAIN_TYPE_FILTER)}
          >
            ext
          </Text>
        </>
      );
    };

    const { getByTestId } = render(<Harness />);
    const input = getByTestId('trainTypeFilterSearchInput');

    fireEvent.changeText(input, '東上');
    fireEvent.press(getByTestId('trainTypeFilterClearQuery'));

    expect(getByTestId('trainTypeFilterSearchInput')).toBe(input);

    fireEvent.changeText(getByTestId('trainTypeFilterSearchInput'), '東上');
    fireEvent.press(getByTestId('externalClear'));

    expect(getByTestId('trainTypeFilterSearchInput')).not.toBe(input);
  });
});

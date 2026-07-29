import { fireEvent, render } from '@testing-library/react-native';
import { AgentHeader } from './AgentHeader';

// 実体はフォント読み込みで非同期 setState するため、act 警告を避けて素の View に差し替える
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: View };
});

jest.mock('jotai', () => ({
  useAtomValue: jest.fn(() => false),
  atom: jest.fn((initialValue) => initialValue),
}));

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
  isJapanese: true,
}));

const defaultProps = {
  showReset: true,
  onBack: jest.fn(),
  onReset: jest.fn(),
};

describe('AgentHeader', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('リセットボタンの表示は主語を省略した短縮ラベルを使う', () => {
    const { getByText, queryByText } = render(
      <AgentHeader {...defaultProps} />
    );

    expect(getByText('destinationAgentResetShort')).toBeTruthy();
    expect(queryByText('destinationAgentReset')).toBeNull();
  });

  it('リセットボタンの読み上げは省略前の文言を使う', () => {
    const { getByLabelText } = render(<AgentHeader {...defaultProps} />);

    expect(getByLabelText('destinationAgentReset')).toBeTruthy();
  });

  it('showResetがfalseならリセットボタンを表示しない', () => {
    const { queryByText } = render(
      <AgentHeader {...defaultProps} showReset={false} />
    );

    expect(queryByText('destinationAgentResetShort')).toBeNull();
  });

  it('リセットボタンを押すとonResetが呼ばれる', () => {
    const onReset = jest.fn();
    const { getByText } = render(
      <AgentHeader {...defaultProps} onReset={onReset} />
    );

    fireEvent.press(getByText('destinationAgentResetShort'));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('戻るボタンを押すとonBackが呼ばれる', () => {
    const onBack = jest.fn();
    const { getByLabelText } = render(
      <AgentHeader {...defaultProps} onBack={onBack} />
    );

    fireEvent.press(getByLabelText('back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

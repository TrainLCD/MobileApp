import { fireEvent, render } from '@testing-library/react-native';
import { AgentInputBar } from './AgentInputBar';

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

// 実体は expo/fetch やセッション層を引き込むため、定数だけを差し替える
jest.mock('~/hooks/useDestinationAgent', () => ({
  AGENT_MAX_MESSAGE_LENGTH: 500,
}));

const defaultProps = {
  value: '渋谷まで行きたい',
  onChangeText: jest.fn(),
  onSend: jest.fn(),
  sending: false,
  rateLimited: false,
};

// 送信を抑止すべき状態。Enter 経路・送信ボタン経路の双方で同じ条件を検証する
const suppressedCases: [string, Partial<typeof defaultProps>][] = [
  ['空白のみの入力', { value: '   ' }],
  ['送信中', { sending: true }],
  ['日次上限に達している場合', { rateLimited: true }],
];

const renderBar = (props: Partial<typeof defaultProps> = {}) => {
  const view = render(<AgentInputBar {...defaultProps} {...props} />);
  return {
    ...view,
    input: view.getByPlaceholderText('destinationAgentPlaceholder'),
  };
};

describe('AgentInputBar', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Enterキーで即送信する', () => {
    const onSend = jest.fn();
    const { input } = renderBar({ onSend });

    fireEvent(input, 'submitEditing');

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('Enterが改行として消費されないよう送信へ振り替える', () => {
    const { input } = renderBar();

    // multiline は維持したまま Enter だけを送信に割り当てる
    expect(input.props.multiline).toBe(true);
    expect(input.props.submitBehavior).toBe('submit');
    // Enter が改行ではなく送信であることをキーラベルでも示す
    expect(input.props.returnKeyType).toBe('send');
  });

  it('空白のみの入力ではEnterで送信しない', () => {
    const onSend = jest.fn();
    const { input } = renderBar({ value: '   ', onSend });

    fireEvent(input, 'submitEditing');

    expect(onSend).not.toHaveBeenCalled();
  });

  it('送信中はEnterで多重送信しない', () => {
    const onSend = jest.fn();
    const { input } = renderBar({ sending: true, onSend });

    fireEvent(input, 'submitEditing');

    expect(onSend).not.toHaveBeenCalled();
  });

  it('日次上限に達している場合はEnterで送信しない', () => {
    const onSend = jest.fn();
    const view = render(
      <AgentInputBar {...defaultProps} onSend={onSend} rateLimited />
    );

    fireEvent(
      view.getByPlaceholderText('destinationAgentRateLimited'),
      'submitEditing'
    );

    expect(onSend).not.toHaveBeenCalled();
  });

  it('送信ボタンからも同じ条件で送信できる', () => {
    const onSend = jest.fn();
    const { getByLabelText } = renderBar({ onSend });

    fireEvent.press(getByLabelText('destinationAgentSend'));

    expect(onSend).toHaveBeenCalledTimes(1);
  });

  // Enter と送信ボタンが同じ canSend 判定を共有していることを、抑止側からも固定する
  it.each(suppressedCases)(
    '%sでは送信ボタンも無効化される',
    (_label, props) => {
      const onSend = jest.fn();
      const { getByLabelText } = render(
        <AgentInputBar {...defaultProps} onSend={onSend} {...props} />
      );
      const button = getByLabelText('destinationAgentSend');

      expect(button).toBeDisabled();

      fireEvent.press(button);

      expect(onSend).not.toHaveBeenCalled();
    }
  );
});

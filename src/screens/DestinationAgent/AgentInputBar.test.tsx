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
});

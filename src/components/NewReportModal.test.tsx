import { act, fireEvent, render } from '@testing-library/react-native';
import type React from 'react';
import NewReportModal from './NewReportModal';

// 実体はフォント読み込みで非同期 setState するため、act 警告を避けて素の View に差し替える
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: View };
});

jest.mock('jotai', () => ({
  useAtomValue: jest.fn(() => false),
  atom: jest.fn((initialValue) => initialValue),
}));

jest.mock('@gorhom/portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
}));

jest.mock('~/utils/dialogPresentation', () => ({
  showDialog: jest.fn(),
}));

const { showDialog } = jest.requireMock('~/utils/dialogPresentation');

const defaultProps = {
  visible: true,
  sending: false,
  onClose: jest.fn(),
  onSubmit: jest.fn(),
  descriptionLowerLimit: 10,
};

const renderModal = (props: Partial<typeof defaultProps> = {}) => {
  const view = render(<NewReportModal {...defaultProps} {...props} />);
  return {
    ...view,
    input: view.getByPlaceholderText('reportPlaceholder'),
  };
};

describe('NewReportModal', () => {
  // プログレスバーの Animated.timing がタイマー経由で state を更新するため、
  // fake timers で act 内に閉じ込めて警告を防ぐ
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('タイトル・ラベル・注意書きを表示する', () => {
    const { getByText } = renderModal();

    expect(getByText('reportModalTitle')).toBeTruthy();
    expect(getByText('reportBodyTitle')).toBeTruthy();
    expect(getByText('reportCaution')).toBeTruthy();
  });

  it('下限未満の入力では残り文字数を表示し、送信してもonSubmitが呼ばれない', () => {
    const onSubmit = jest.fn();
    const { input, getByText, queryByText } = renderModal({ onSubmit });

    fireEvent.changeText(input, 'short');

    expect(getByText('remainingCharacters')).toBeTruthy();
    expect(queryByText('sendable')).toBeNull();

    fireEvent.press(getByText('reportSend'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('下限以上の入力で送信可能になり、onSubmitに入力内容を渡す', () => {
    const onSubmit = jest.fn();
    const text = 'あ'.repeat(10);
    const { input, getByText, queryByText } = renderModal({ onSubmit });

    fireEvent.changeText(input, text);

    expect(getByText('sendable')).toBeTruthy();
    expect(queryByText('remainingCharacters')).toBeNull();

    fireEvent.press(getByText('reportSend'));
    expect(onSubmit).toHaveBeenCalledWith(text);
  });

  it('未入力で閉じると確認ダイアログなしでonCloseを呼ぶ', () => {
    const onClose = jest.fn();
    const { getByText } = renderModal({ onClose });

    fireEvent.press(getByText('close'));

    expect(showDialog).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('入力済みで閉じると破棄確認ダイアログを表示し、即時にはonCloseを呼ばない', () => {
    const onClose = jest.fn();
    const { input, getByText } = renderModal({ onClose });

    fireEvent.changeText(input, '入力済みのフィードバック');
    fireEvent.press(getByText('close'));

    expect(showDialog).toHaveBeenCalledWith(
      'confirmDiscardTitle',
      'confirmDiscardMessage',
      expect.any(Array)
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('送信中はボタンが送信中表記になり、入力欄が編集不可になる', () => {
    const { input, getByText } = renderModal({ sending: true });

    expect(getByText('reportSendInProgress')).toBeTruthy();
    expect(input.props.editable).toBe(false);
  });
});

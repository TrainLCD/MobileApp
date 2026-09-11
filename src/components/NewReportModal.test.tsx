import { act, fireEvent, render } from '@testing-library/react-native';
import type React from 'react';
import { StyleSheet } from 'react-native';
import { FAQ_URL } from '~/constants';
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

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
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
const { openBrowserAsync } = jest.requireMock('expo-web-browser');
const { useAtomValue } = jest.requireMock('jotai');

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
    // clearAllMocks は mockReturnValue を復元しないため、LEDテーマの上書きを明示的に戻す
    useAtomValue.mockReturnValue(false);
    jest.clearAllMocks();
  });

  it('タイトル・ラベル・注意書きを表示する', () => {
    const { getByText } = renderModal();

    expect(getByText('reportModalTitle')).toBeTruthy();
    expect(getByText('reportBodyTitle')).toBeTruthy();
    expect(getByText('reportCaution')).toBeTruthy();
  });

  // 「動かない」系の報告は原因が非対応環境であることがあり、その判定はアプリ側では
  // 行えないため、送信前にFAQへ誘導できることを固定する
  // 外部ブラウザへ飛ばすと入力中の本文を残したままアプリを離れることになるため、
  // アプリ内ブラウザで開くことも併せて固定する
  it('FAQリンクをタップするとよくある質問をアプリ内ブラウザで開く', () => {
    openBrowserAsync.mockResolvedValue(undefined);
    const { getByText } = renderModal();

    fireEvent.press(getByText('reportFaqLink'));

    expect(openBrowserAsync).toHaveBeenCalledWith(FAQ_URL);
  });

  // 押せることがリンク語自体から分かる必要があるため、下線とアクセント色を固定する
  it('FAQリンクは下線付きで表示される', () => {
    const { getByText } = renderModal();

    const link = getByText('reportFaqLink');
    const style = StyleSheet.flatten(link.props.style);

    expect(style.textDecorationLine).toBe('underline');
  });

  // 長文を書いたあとで初めて知らせる形を避けつつ、入力欄への動線も塞がないため、
  // 導線は入力欄より後・注意書きより前に固定する
  it('FAQの案内は入力欄より後、注意書きより前に描画される', () => {
    const { toJSON } = renderModal();

    const texts: string[] = [];
    const walk = (node: unknown): void => {
      if (node == null) return;
      if (typeof node === 'string') {
        texts.push(node);
        return;
      }
      if (Array.isArray(node)) {
        for (const child of node) walk(child);
        return;
      }
      walk((node as { children?: unknown }).children);
    };
    walk(toJSON());

    expect(texts.indexOf('reportBodyTitle')).toBeGreaterThanOrEqual(0);
    expect(texts.indexOf('reportBodyTitle')).toBeLessThan(
      texts.indexOf('reportFaqNotice')
    );
    expect(texts.indexOf('reportFaqNotice')).toBeLessThan(
      texts.indexOf('reportCaution')
    );
  });

  it('よくある質問を開けなくても送信フローを妨げない', async () => {
    openBrowserAsync.mockRejectedValue(new Error('cannot open'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const onSubmit = jest.fn();
    const { getByText, input } = renderModal({ onSubmit });

    fireEvent.press(getByText('reportFaqLink'));
    await act(async () => {
      await Promise.resolve();
    });

    expect(openBrowserAsync).toHaveBeenCalledWith(FAQ_URL);
    expect(warn).toHaveBeenCalled();

    // 警告が出たことだけでは「送信を妨げない」の保証にならないため、
    // 失敗後に実際へ送信まで通すことを確かめる
    fireEvent.changeText(input, 'FAQを開けなくても送信できること');
    fireEvent.press(getByText('reportSend'));

    expect(onSubmit).toHaveBeenCalledWith('FAQを開けなくても送信できること');
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

  it('LEDテーマでは入力欄が角丸なし・白文字・透過背景になる', () => {
    useAtomValue.mockReturnValue(true);
    const { input } = renderModal();

    expect(StyleSheet.flatten(input.props.style)).toEqual(
      expect.objectContaining({
        borderRadius: 0,
        color: '#fff',
        backgroundColor: 'transparent',
        // 非フォーカス時のLEDボーダー色。フォーカス時は #fff に変わる
        borderColor: 'rgba(255, 255, 255, 0.4)',
      })
    );
  });
});

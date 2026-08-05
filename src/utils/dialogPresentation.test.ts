import {
  completePresentedDialogDismissal,
  dismissPresentedDialog,
  getDialogPresentationSnapshot,
  resetDialogPresentationForTests,
  showDialog,
  showDialogWhilePresenting,
} from './dialogPresentation';

describe('dialogPresentation', () => {
  afterEach(() => {
    resetDialogPresentationForTests();
  });

  it('同じキーのダイアログが表示中なら二重表示しない', () => {
    expect(showDialogWhilePresenting('notice', 'title')).toBe(true);
    expect(showDialogWhilePresenting('notice', 'title')).toBe(false);
    expect(getDialogPresentationSnapshot().request?.title).toBe('title');
  });

  it('ボタン押下と閉じるアニメーション完了後にコールバックを呼ぶ', () => {
    const onPress = jest.fn();
    showDialog('title', undefined, [{ text: 'OK', onPress }]);

    dismissPresentedDialog(0);
    expect(onPress).not.toHaveBeenCalled();

    completePresentedDialogDismissal();
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(getDialogPresentationSnapshot().request).toBeNull();
  });

  it('背景タップで閉じた場合はonDismissを呼ぶ', () => {
    const onDismiss = jest.fn();
    showDialog('title', undefined, undefined, { onDismiss });

    dismissPresentedDialog(undefined, true);
    completePresentedDialogDismissal();

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('表示中に追加されたダイアログを順番に表示する', () => {
    showDialog('first');
    showDialog('second');

    dismissPresentedDialog(0);
    completePresentedDialogDismissal();

    expect(getDialogPresentationSnapshot()).toMatchObject({
      visible: true,
      request: { title: 'second' },
    });
  });
});

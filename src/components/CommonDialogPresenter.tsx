import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { BackHandler } from 'react-native';
import {
  completePresentedDialogDismissal,
  dismissPresentedDialog,
  getDialogPresentationSnapshot,
  subscribeDialogPresentation,
} from '~/utils/dialogPresentation';
import { CommonDialogModal } from './CommonDialogModal';

export const CommonDialogPresenter: React.FC = () => {
  // dialogPresentation の外部ストアを購読する唯一のコンポーネント。
  // 各画面に個別のモーダル状態を持たせず、アプリ全体で一つだけ描画する。
  const { request, visible } = useSyncExternalStore(
    subscribeDialogPresentation,
    getDialogPresentationSnapshot,
    getDialogPresentationSnapshot
  );
  const [checkedRequestId, setCheckedRequestId] = useState<number | null>(null);

  useEffect(() => {
    if (!request) {
      return;
    }

    // ダイアログ表示中は、Android の戻るキーを背後の画面へ伝播させない。
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (request.options.cancelable ?? true) {
          dismissPresentedDialog(undefined, true);
        }
        return true;
      }
    );
    return () => subscription.remove();
  }, [request]);

  if (!request) {
    return null;
  }

  // cancel は左側のボタン、checkbox は本文下、それ以外を右側の確定ボタンとして扱う。
  const cancelButtonIndex = request.buttons.findIndex(
    (button) => button.style === 'cancel'
  );
  const checkboxButtonIndex = request.buttons.findIndex(
    (button) => button.style === 'checkbox'
  );
  const confirmButtonIndex = request.buttons.findIndex(
    (button) => button.style !== 'cancel' && button.style !== 'checkbox'
  );
  const confirmButton = request.buttons[confirmButtonIndex];
  const cancelButton = request.buttons[cancelButtonIndex];
  const checkboxButton = request.buttons[checkboxButtonIndex];
  const checkboxChecked = checkedRequestId === request.id;

  return (
    <CommonDialogModal
      visible={visible}
      emoji={
        request.options.emoji ??
        (confirmButton?.style === 'destructive' ? '⚠️' : 'ℹ️')
      }
      title={request.title}
      description={request.message ?? ''}
      checkboxText={checkboxButton?.text}
      checkboxChecked={checkboxChecked}
      onCheckboxChange={(checked) =>
        setCheckedRequestId(checked ? request.id : null)
      }
      cancelButtonText={cancelButton?.text}
      confirmButtonText={confirmButton?.text ?? 'OK'}
      confirmButtonDestructive={confirmButton?.style === 'destructive'}
      dismissOnBackdropPress={request.options.cancelable ?? true}
      onClose={() => dismissPresentedDialog(undefined, true)}
      onCancel={() => dismissPresentedDialog(cancelButtonIndex)}
      onConfirm={() =>
        dismissPresentedDialog(
          confirmButtonIndex,
          false,
          checkboxChecked ? checkboxButtonIndex : undefined
        )
      }
      // ボタン処理は閉じるアニメーションとの競合を避けるため、完了後に実行する。
      onCloseAnimationEnd={completePresentedDialogDismissal}
      testID="common-dialog-presenter"
    />
  );
};

export default React.memo(CommonDialogPresenter);

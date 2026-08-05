import React, { useEffect, useSyncExternalStore } from 'react';
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

  // 従来のダイアログ呼び出しと同じボタン配列を、共通UIの最大2ボタンへ割り当てる。
  // cancel 指定のボタンを左側、それ以外を右側の確定ボタンとして扱う。
  const styledCancelButtonIndex = request.buttons.findIndex(
    (button) => button.style === 'cancel'
  );
  const cancelButtonIndex =
    request.buttons.length > 1 ? styledCancelButtonIndex : -1;
  const confirmButtonIndex = request.buttons.findIndex(
    (_, index) => index !== cancelButtonIndex
  );
  const confirmButton = request.buttons[confirmButtonIndex];
  const cancelButton = request.buttons[cancelButtonIndex];

  return (
    <CommonDialogModal
      visible={visible}
      emoji={
        request.options.emoji ??
        (confirmButton?.style === 'destructive' ? '⚠️' : 'ℹ️')
      }
      title={request.title}
      description={request.message ?? ''}
      cancelButtonText={cancelButton?.text}
      confirmButtonText={confirmButton?.text ?? 'OK'}
      confirmButtonDestructive={confirmButton?.style === 'destructive'}
      dismissOnBackdropPress={request.options.cancelable ?? true}
      onClose={() => dismissPresentedDialog(undefined, true)}
      onCancel={() => dismissPresentedDialog(cancelButtonIndex)}
      onConfirm={() => dismissPresentedDialog(confirmButtonIndex)}
      // ボタン処理は閉じるアニメーションとの競合を避けるため、完了後に実行する。
      onCloseAnimationEnd={completePresentedDialogDismissal}
      testID="common-dialog-presenter"
    />
  );
};

export default React.memo(CommonDialogPresenter);

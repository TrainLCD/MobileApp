/**
 * ダイアログの操作定義。
 * 確定操作を1個、必要に応じてキャンセル操作とチェックボックスを1個ずつ指定する。
 */
export type DialogButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive' | 'checkbox';
  onPress?: () => void | Promise<void>;
};

/**
 * CommonDialogModal に依存しない、ダイアログ表示時の追加設定。
 * 画面側は React コンポーネントを直接操作せず、この値だけを渡す。
 */
export type DialogOptions = {
  emoji?: string;
  cancelable?: boolean;
  onDismiss?: () => void;
};

export type DialogRequest = {
  id: number;
  presentationKey?: string;
  title: string;
  message?: string;
  buttons: DialogButton[];
  options: DialogOptions;
};

export type DialogPresentationSnapshot = {
  request: DialogRequest | null;
  visible: boolean;
};

// どの画面からでもダイアログを表示できるよう、React の外に小さな外部ストアを置く。
// CommonDialogPresenter だけがこのストアを購読し、実際のモーダル描画を担当する。
const listeners = new Set<() => void>();

// 表示中に別の要求が来ても重ならないよう、後続のダイアログはここで待機させる。
const queuedRequests: DialogRequest[] = [];
let nextRequestId = 1;
let snapshot: DialogPresentationSnapshot = {
  request: null,
  visible: false,
};

// ボタンの処理はモーダルが画面から消えてから実行する。
// 先に画面遷移などが走り、閉じるアニメーションと競合することを防ぐための一時保存。
let pendingButtonIndex: number | undefined;
let pendingCheckedButtonIndex: number | undefined;
let dismissedByBackdrop = false;

const emit = () => {
  listeners.forEach((listener) => listener());
};

const activateRequest = (request: DialogRequest) => {
  snapshot = { request, visible: true };
  emit();
};

const isKeyPresenting = (key: string) =>
  snapshot.request?.presentationKey === key ||
  queuedRequests.some((request) => request.presentationKey === key);

const normalizeButtons = (buttons?: DialogButton[]): DialogButton[] => {
  const normalizedButtons = buttons?.length ? buttons : [{ text: 'OK' }];
  const cancelButtonCount = normalizedButtons.filter(
    (button) => button.style === 'cancel'
  ).length;
  const checkboxButtonCount = normalizedButtons.filter(
    (button) => button.style === 'checkbox'
  ).length;
  const confirmButtonCount = normalizedButtons.filter(
    (button) => button.style !== 'cancel' && button.style !== 'checkbox'
  ).length;

  if (
    cancelButtonCount > 1 ||
    checkboxButtonCount > 1 ||
    confirmButtonCount !== 1
  ) {
    throw new Error(
      'Dialog buttons must contain exactly one confirm button and at most one cancel button and checkbox.'
    );
  }

  return normalizedButtons;
};

const enqueueDialog = (
  presentationKey: string | undefined,
  title: string,
  message?: string,
  buttons?: DialogButton[],
  options?: DialogOptions
): boolean => {
  // 共通UIで扱える操作だけになるよう、要求を受け取った時点で検証する。
  const normalizedButtons = normalizeButtons(buttons);

  // StrictMode で effect が再実行されても、同じ論理ダイアログは一つだけ表示する。
  if (presentationKey && isKeyPresenting(presentationKey)) {
    return false;
  }

  const request: DialogRequest = {
    id: nextRequestId,
    presentationKey,
    title,
    message,
    buttons: normalizedButtons,
    options: options ?? {},
  };
  nextRequestId += 1;

  if (snapshot.request) {
    queuedRequests.push(request);
  } else {
    activateRequest(request);
  }
  return true;
};

/**
 * ユーザー操作を起点とする通常のダイアログを表示する。
 * すでに別のダイアログが表示中なら、自動的に待機キューへ追加される。
 */
export const showDialog = (
  title: string,
  message?: string,
  buttons?: DialogButton[],
  options?: DialogOptions
): boolean => enqueueDialog(undefined, title, message, buttons, options);

/**
 * effect などから自動表示するダイアログを、同じキーで重複させずに表示する。
 * React StrictMode で同じ effect が複数回評価される可能性がある箇所で使用する。
 */
export const showDialogWhilePresenting = (
  key: string,
  title: string,
  message?: string,
  buttons?: DialogButton[],
  options?: DialogOptions
): boolean => enqueueDialog(key, title, message, buttons, options);

export const subscribeDialogPresentation = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getDialogPresentationSnapshot = () => snapshot;

/**
 * モーダルを非表示にし、押されたボタンをアニメーション完了まで保持する。
 * byBackdrop は背景タップや Android の戻るキーによるキャンセルを表す。
 */
export const dismissPresentedDialog = (
  buttonIndex?: number,
  byBackdrop = false,
  checkedButtonIndex?: number
) => {
  if (!snapshot.request || !snapshot.visible) {
    return;
  }

  pendingButtonIndex = buttonIndex;
  pendingCheckedButtonIndex = checkedButtonIndex;
  dismissedByBackdrop = byBackdrop;
  snapshot = { ...snapshot, visible: false };
  emit();
};

/**
 * 閉じるアニメーションの完了後にコールバックを実行し、次のダイアログを表示する。
 */
export const completePresentedDialogDismissal = () => {
  const completedRequest = snapshot.request;
  if (!completedRequest || snapshot.visible) {
    return;
  }

  const buttonIndex = pendingButtonIndex;
  const checkedButtonIndex = pendingCheckedButtonIndex;
  const shouldCallOnDismiss = dismissedByBackdrop;
  pendingButtonIndex = undefined;
  pendingCheckedButtonIndex = undefined;
  dismissedByBackdrop = false;

  // 待機済みの要求を先に有効化し、コールバック内で追加された要求をその後ろへ並べる。
  // これにより A の完了処理が C を追加しても、表示順は A → B → C のままになる。
  const nextRequest = queuedRequests.shift();
  if (nextRequest) {
    activateRequest(nextRequest);
  } else {
    snapshot = { request: null, visible: false };
    emit();
  }

  // 表示状態の更新を先に通知してから、画面遷移などを含む処理を実行する。
  if (checkedButtonIndex !== undefined) {
    void completedRequest.buttons[checkedButtonIndex]?.onPress?.();
  }
  if (buttonIndex !== undefined) {
    void completedRequest.buttons[buttonIndex]?.onPress?.();
  } else if (shouldCallOnDismiss) {
    completedRequest.options.onDismiss?.();
  }
};

// テスト間でモジュールスコープの状態を共有しないための初期化関数。
export const resetDialogPresentationForTests = () => {
  queuedRequests.splice(0);
  nextRequestId = 1;
  pendingButtonIndex = undefined;
  pendingCheckedButtonIndex = undefined;
  dismissedByBackdrop = false;
  snapshot = { request: null, visible: false };
  emit();
};

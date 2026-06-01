import { Alert, type AlertButton, type AlertOptions } from 'react-native';

const presentingAlertKeys = new Set<string>();

/**
 * 同じ論理キーの native alert が表示中でない場合だけ表示する。
 *
 * React StrictMode の開発時検査では、mount 時の effect が 2 回実行される。
 * effect 内で AsyncStorage の永続フラグを確認してから Alert.alert を呼ぶと、
 * 最初の alert が閉じられる前に 2 回目の effect も同じ条件を通過し、
 * native alert が二重に積まれることがある。
 *
 * この helper は「同じ alert が表示中」の間だけ再入を防ぐ。ユーザーがボタンを
 * 押す、または alert を dismiss するとキーを解放するため、各 alert 自身の
 * 「今後表示しない」永続フラグが立っていない限り、次回以降の表示は妨げない。
 */
export const showAlertWhilePresenting = (
  key: string,
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions
): boolean => {
  if (presentingAlertKeys.has(key)) {
    return false;
  }

  presentingAlertKeys.add(key);

  const release = () => {
    presentingAlertKeys.delete(key);
  };

  const sourceButtons = buttons ?? [{ text: 'OK' }];
  const wrappedButtons = sourceButtons.map((button) => ({
    ...button,
    onPress: (value?: string) => {
      try {
        button.onPress?.(value as never);
      } finally {
        release();
      }
    },
  }));

  const wrappedOptions = {
    ...options,
    onDismiss: () => {
      options?.onDismiss?.();
      release();
    },
  };

  Alert.alert(title, message, wrappedButtons, wrappedOptions);
  return true;
};

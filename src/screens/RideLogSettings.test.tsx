import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { STORAGE_KEYS } from '~/constants';
import { deleteAllRideLogs, hasRideLogs } from '~/lib/rideLog';
import { storage } from '~/lib/storage';
import {
  rideLogEnabledAtom,
  rideLogSettingsSeenAtom,
} from '~/store/atoms/rideLog';
import {
  completePresentedDialogDismissal,
  dismissPresentedDialog,
  getDialogPresentationSnapshot,
  resetDialogPresentationForTests,
} from '~/utils/dialogPresentation';
import RideLogSettingsScreen from './RideLogSettings';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => ({
      goBack: jest.fn(),
    }),
    // 画面が表示されたときの読み込みを、マウント時の effect として再現する
    useFocusEffect: (effect: () => undefined | (() => void)) => {
      useEffect(effect, [effect]);
    },
  };
});

// 既定では記録があることにして、削除を押せる状態から始める
jest.mock('~/lib/rideLog', () => ({
  deleteAllRideLogs: jest.fn(() => Promise.resolve()),
  hasRideLogs: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('~/components/FooterTabBar', () => () => null);
jest.mock('~/components/SettingsHeader', () => ({
  SettingsHeader: () => null,
}));
jest.mock('~/components/Button', () => () => null);
jest.mock('~/translation', () => ({
  translate: (key: string) => key,
}));

const renderWithStore = (rideLogEnabled = false) => {
  const store = createStore();
  store.set(rideLogEnabledAtom, rideLogEnabled);

  const screen = render(
    <Provider store={store}>
      <RideLogSettingsScreen />
    </Provider>
  );

  return { ...screen, store };
};

// 表示中のダイアログで指定したボタンを押し、閉じるアニメーションの完了まで進める
const pressDialogButton = async (text: string) => {
  const request = getDialogPresentationSnapshot().request;
  const index = request?.buttons.findIndex((b) => b.text === text) ?? -1;
  expect(index).toBeGreaterThanOrEqual(0);
  await act(async () => {
    dismissPresentedDialog(index);
    completePresentedDialogDismissal();
    await Promise.resolve();
  });
};

describe('RideLogSettingsScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
    resetDialogPresentationForTests();
  });

  it('記録をONにするとatomとストレージへ保存される', () => {
    const { getByLabelText, store } = renderWithStore(false);

    fireEvent.press(getByLabelText('rideLogRecordTitle'));

    expect(store.get(rideLogEnabledAtom)).toBe(true);
    expect(storage.getString(STORAGE_KEYS.RIDE_LOG_ENABLED)).toBe('true');
  });

  it('記録をOFFにしても保存済みの記録は削除しない', () => {
    const { getByLabelText, store } = renderWithStore(true);

    fireEvent.press(getByLabelText('rideLogRecordTitle'));

    expect(store.get(rideLogEnabledAtom)).toBe(false);
    expect(storage.getString(STORAGE_KEYS.RIDE_LOG_ENABLED)).toBe('false');
    expect(deleteAllRideLogs).not.toHaveBeenCalled();
  });

  it('ストレージへの保存に失敗した場合はatom状態をロールバックしエラーを通知する', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { getByLabelText, store } = renderWithStore(false);
    // 画面を開いたときにも既読の保存が走るので、描いた後でトグルの保存だけを失敗させる
    const setSpy = jest.spyOn(storage, 'set').mockImplementationOnce(() => {
      throw new Error('storage failure');
    });

    fireEvent.press(getByLabelText('rideLogRecordTitle'));

    expect(store.get(rideLogEnabledAtom)).toBe(false);
    expect(getDialogPresentationSnapshot().request).toMatchObject({
      title: 'errorTitle',
      message: 'failedToSavePreference',
    });

    setSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('全件削除は確認ダイアログでOKを押したときだけ実行する', async () => {
    const { getByLabelText } = renderWithStore(true);

    fireEvent.press(getByLabelText('rideLogDeleteAll'));
    expect(getDialogPresentationSnapshot().request).toMatchObject({
      message: 'rideLogDeleteAllConfirm',
    });

    await pressDialogButton('cancel');
    expect(deleteAllRideLogs).not.toHaveBeenCalled();

    fireEvent.press(getByLabelText('rideLogDeleteAll'));
    await pressDialogButton('OK');
    expect(deleteAllRideLogs).toHaveBeenCalledTimes(1);
    expect(getDialogPresentationSnapshot().request).toMatchObject({
      message: 'rideLogDeleted',
    });
  });

  it('削除に失敗したらエラーを通知する', async () => {
    (deleteAllRideLogs as jest.Mock).mockRejectedValueOnce(new Error('db'));
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { getByLabelText } = renderWithStore(true);

    fireEvent.press(getByLabelText('rideLogDeleteAll'));
    await pressDialogButton('OK');

    expect(getDialogPresentationSnapshot().request).toMatchObject({
      title: 'errorTitle',
      message: 'rideLogDeleteFailed',
    });
    consoleErrorSpy.mockRestore();
  });
  describe('記録が無いとき', () => {
    const deleteButton = (
      getByTestId: (id: string) => { props: Record<string, unknown> }
    ) => getByTestId('ride-log-delete-all');

    it('記録が無ければ「記録をすべて削除」を押せなくする', async () => {
      (hasRideLogs as jest.Mock).mockResolvedValueOnce(false);
      const { getByTestId } = renderWithStore(true);
      await waitFor(() =>
        expect(
          deleteButton(getByTestId).props.accessibilityState
        ).toMatchObject({ disabled: true })
      );
      fireEvent.press(getByTestId('ride-log-delete-all'));
      expect(getDialogPresentationSnapshot().request).toBeNull();
    });

    it('全件削除したあとは押せなくする', async () => {
      const { getByTestId } = renderWithStore(true);
      await waitFor(() => expect(hasRideLogs).toHaveBeenCalled());
      fireEvent.press(getByTestId('ride-log-delete-all'));
      await pressDialogButton('OK');
      expect(deleteAllRideLogs).toHaveBeenCalled();
      expect(deleteButton(getByTestId).props.accessibilityState).toMatchObject({
        disabled: true,
      });
    });

    it('記録があるかを読めなかったときは押せるままにする', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (hasRideLogs as jest.Mock).mockRejectedValueOnce(new Error('db'));
      const { getByTestId } = renderWithStore(true);
      await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
      expect(deleteButton(getByTestId).props.accessibilityState).toMatchObject({
        disabled: false,
      });
      consoleSpy.mockRestore();
    });
  });
  it('開いた時点で、設定リストとフッターの印を消すために既読を記録する', () => {
    const { store } = renderWithStore(false);
    expect(store.get(rideLogSettingsSeenAtom)).toBe(true);
    expect(storage.getString(STORAGE_KEYS.RIDE_LOG_SETTINGS_SEEN)).toBe('true');
  });
});

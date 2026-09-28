import { act, fireEvent, render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { STORAGE_KEYS } from '~/constants';
import { deleteAllRideLogs } from '~/lib/rideLog';
import { storage } from '~/lib/storage';
import { rideLogEnabledAtom } from '~/store/atoms/rideLog';
import {
  completePresentedDialogDismissal,
  dismissPresentedDialog,
  getDialogPresentationSnapshot,
  resetDialogPresentationForTests,
} from '~/utils/dialogPresentation';
import RideLogSettingsScreen from './RideLogSettings';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

jest.mock('~/lib/rideLog', () => ({
  deleteAllRideLogs: jest.fn(() => Promise.resolve()),
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
    const setSpy = jest.spyOn(storage, 'set').mockImplementationOnce(() => {
      throw new Error('storage failure');
    });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { getByLabelText, store } = renderWithStore(false);

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
});

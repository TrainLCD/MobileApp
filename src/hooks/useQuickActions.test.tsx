import { act, renderHook } from '@testing-library/react-native';
import * as QuickActions from 'expo-quick-actions';
import { useSetAtom, useStore } from 'jotai';
import { confirmExternalRouteSwitch } from '~/utils/confirmExternalRouteSwitch';
import { navigateToSelectLine } from '~/utils/navigateToSelectLine';
import { useQuickActions } from './useQuickActions';

jest.mock('expo-quick-actions', () => ({
  isSupported: jest.fn().mockResolvedValue(false),
  addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn().mockReturnValue([]),
  useSetAtom: jest.fn(),
  useStore: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue([]) }),
}));
jest.mock('~/utils/confirmExternalRouteSwitch', () => ({
  confirmExternalRouteSwitch: jest.fn(),
}));
jest.mock('~/utils/navigateToSelectLine', () => ({
  navigateToSelectLine: jest.fn().mockReturnValue(true),
}));

afterEach(() => jest.clearAllMocks());

it.each([true, false])(
  '確認結果が%sの場合だけクイックアクションを適用する',
  async (confirmed) => {
    let resolveConfirmation: (value: boolean) => void = () => {};
    (confirmExternalRouteSwitch as jest.Mock).mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveConfirmation = resolve;
      })
    );
    (useStore().get as jest.Mock).mockReturnValue([
      { id: 'preset-id', name: '休日のお出かけ' },
    ]);
    const setNavigation = jest.fn();
    (useSetAtom as jest.Mock).mockReturnValue(setNavigation);
    renderHook(() => useQuickActions());
    const listener = (QuickActions.addListener as jest.Mock).mock.calls[0][0];
    let handling: Promise<void>;
    await act(async () => {
      handling = listener({ params: { routeId: 'preset-id' } });
    });
    expect(confirmExternalRouteSwitch).toHaveBeenCalledWith('休日のお出かけ');
    expect(setNavigation).not.toHaveBeenCalled();
    expect(navigateToSelectLine).not.toHaveBeenCalled();
    await act(async () => {
      resolveConfirmation(confirmed);
      await handling;
    });
    expect(setNavigation).toHaveBeenCalledTimes(confirmed ? 1 : 0);
    expect(navigateToSelectLine).toHaveBeenCalledTimes(confirmed ? 1 : 0);
  }
);

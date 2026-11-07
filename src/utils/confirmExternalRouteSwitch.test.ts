import { navigationRef } from '~/stacks/rootNavigation';
import { confirmExternalRouteSwitch } from './confirmExternalRouteSwitch';
import {
  completePresentedDialogDismissal,
  dismissPresentedDialog,
  getDialogPresentationSnapshot,
  resetDialogPresentationForTests,
} from './dialogPresentation';

jest.mock('~/stacks/rootNavigation', () => ({
  navigationRef: { isReady: jest.fn(), getRootState: jest.fn() },
}));
jest.mock('~/translation', () => ({ translate: (key: string) => key }));

beforeEach(() => {
  (navigationRef.isReady as jest.Mock).mockReturnValue(true);
  (navigationRef.getRootState as jest.Mock).mockReturnValue({
    routes: [{ name: 'MainStack', state: { routes: [{ name: 'Main' }] } }],
  });
});
afterEach(() => {
  resetDialogPresentationForTests();
  jest.clearAllMocks();
});

it('起動時には確認を表示しない', async () => {
  (navigationRef.isReady as jest.Mock).mockReturnValue(false);
  expect(await confirmExternalRouteSwitch()).toBe(true);
  expect(getDialogPresentationSnapshot().request).toBeNull();
});

it('路線選択画面では確認を表示しない', async () => {
  (navigationRef.getRootState as jest.Mock).mockReturnValue({
    routes: [
      { name: 'MainStack', state: { routes: [{ name: 'SelectLine' }] } },
    ],
  });
  expect(await confirmExternalRouteSwitch()).toBe(true);
  expect(getDialogPresentationSnapshot().request).toBeNull();
});

it('走行画面の上に設定画面を重ねていても確認する', async () => {
  (navigationRef.getRootState as jest.Mock).mockReturnValue({
    routes: [
      {
        name: 'MainStack',
        state: { routes: [{ name: 'Main' }, { name: 'AppSettings' }] },
      },
    ],
  });
  const result = confirmExternalRouteSwitch();
  expect(getDialogPresentationSnapshot().visible).toBe(true);
  dismissPresentedDialog(1);
  completePresentedDialogDismissal();
  expect(await result).toBe(true);
});

it.each([0, undefined])(
  'キャンセルまたは背景・戻る操作で中止する: %s',
  async (button) => {
    const result = confirmExternalRouteSwitch();
    dismissPresentedDialog(button, button === undefined);
    completePresentedDialogDismissal();
    expect(await result).toBe(false);
  }
);

it('確認中の追加要求は破棄し、承認済みの要求だけを続ける', async () => {
  const first = confirmExternalRouteSwitch();
  expect(await confirmExternalRouteSwitch()).toBe(false);
  dismissPresentedDialog(1);
  completePresentedDialogDismissal();
  expect(await first).toBe(true);
  expect(getDialogPresentationSnapshot().request).toBeNull();
});

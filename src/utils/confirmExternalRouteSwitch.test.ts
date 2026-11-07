import { getLineSymbolImage } from '~/lineSymbolImage';
import { navigationRef } from '~/stacks/rootNavigation';
import { translate } from '~/translation';
import { confirmExternalRouteSwitch } from './confirmExternalRouteSwitch';
import {
  completePresentedDialogDismissal,
  dismissPresentedDialog,
  getDialogPresentationSnapshot,
  resetDialogPresentationForTests,
} from './dialogPresentation';

jest.mock('~/lineSymbolImage', () => ({ getLineSymbolImage: jest.fn() }));
jest.mock('~/stacks/rootNavigation', () => ({
  navigationRef: { isReady: jest.fn(), getRootState: jest.fn() },
}));
jest.mock('~/translation', () => ({
  translate: jest.fn((key: string) => key),
}));

beforeEach(() => {
  (getLineSymbolImage as jest.Mock).mockReturnValue({ signPath: 101 });
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

it('プリセット名がある場合は専用の文言に渡す', async () => {
  const result = confirmExternalRouteSwitch({
    name: '自宅 → 職場',
    lineId: 11302,
  });
  expect(translate).toHaveBeenCalledWith('confirmPresetRouteSwitchTitle', {
    presetName: '自宅 → 職場',
  });
  expect(getLineSymbolImage).toHaveBeenCalledWith({ id: 11302 }, false);
  expect(getDialogPresentationSnapshot().request?.options.lineSymbol).toEqual({
    image: 101,
  });
  dismissPresentedDialog(0);
  completePresentedDialogDismissal();
  expect(await result).toBe(false);
});

it('名前を取得できない場合は通常の経路切り替え確認を表示する', async () => {
  const result = confirmExternalRouteSwitch();
  expect(getDialogPresentationSnapshot().request?.title).toBe(
    'confirmExternalRouteSwitchTitle'
  );
  dismissPresentedDialog(0);
  completePresentedDialogDismissal();
  expect(await result).toBe(false);
});

it('路線記号の画像がないプリセットでも確認・キャンセルできる', async () => {
  (getLineSymbolImage as jest.Mock).mockReturnValue(null);
  const result = confirmExternalRouteSwitch({
    name: '記号なしの路線',
    lineId: 99999,
  });
  expect(
    getDialogPresentationSnapshot().request?.options.lineSymbol
  ).toBeUndefined();
  dismissPresentedDialog(0);
  completePresentedDialogDismissal();
  expect(await result).toBe(false);
});

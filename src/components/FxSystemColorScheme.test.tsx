import { render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { Appearance } from 'react-native';
import { COLOR_SCHEME } from '~/models/ColorScheme';
import { systemColorSchemeAtom } from '~/store/atoms/colorScheme';
import FxSystemColorScheme from './FxSystemColorScheme';

type AppearanceListener = (preferences: {
  colorScheme: 'light' | 'dark';
}) => void;

describe('FxSystemColorScheme', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('マウント時に端末の配色をatomへ反映する', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    const store = createStore();

    render(
      <Provider store={store}>
        <FxSystemColorScheme />
      </Provider>
    );

    expect(store.get(systemColorSchemeAtom)).toBe(COLOR_SCHEME.DARK);
  });

  // 現在値の取得を先に行うと、取得から購読開始までの間の変更を取りこぼす
  it('現在値を読む前に購読を開始する', () => {
    const callOrder: string[] = [];
    jest.spyOn(Appearance, 'getColorScheme').mockImplementation(() => {
      callOrder.push('getColorScheme');
      return 'light';
    });
    jest.spyOn(Appearance, 'addChangeListener').mockImplementation(() => {
      callOrder.push('addChangeListener');
      return { remove: jest.fn() } as never;
    });

    render(
      <Provider store={createStore()}>
        <FxSystemColorScheme />
      </Provider>
    );

    expect(callOrder).toEqual(['addChangeListener', 'getColorScheme']);
  });

  it('購読開始から現在値取得までの間に変わってもダークを取りこぼさない', () => {
    let listener: AppearanceListener | null = null;
    jest
      .spyOn(Appearance, 'addChangeListener')
      .mockImplementation((cb: unknown) => {
        listener = cb as AppearanceListener;
        return { remove: jest.fn() } as never;
      });
    // 購読直後に端末側がダークへ切り替わった状況を再現する
    jest.spyOn(Appearance, 'getColorScheme').mockImplementation(() => {
      (listener as AppearanceListener | null)?.({ colorScheme: 'dark' });
      return 'dark';
    });

    const store = createStore();
    render(
      <Provider store={store}>
        <FxSystemColorScheme />
      </Provider>
    );

    expect(store.get(systemColorSchemeAtom)).toBe(COLOR_SCHEME.DARK);
  });

  it('端末の配色が変わったらatomへ反映する', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    let listener: AppearanceListener | null = null;
    const remove = jest.fn();
    jest
      .spyOn(Appearance, 'addChangeListener')
      .mockImplementation((cb: unknown) => {
        listener = cb as AppearanceListener;
        return { remove } as never;
      });

    const store = createStore();
    const { unmount } = render(
      <Provider store={store}>
        <FxSystemColorScheme />
      </Provider>
    );

    expect(store.get(systemColorSchemeAtom)).toBe(COLOR_SCHEME.LIGHT);

    (listener as AppearanceListener | null)?.({ colorScheme: 'dark' });
    expect(store.get(systemColorSchemeAtom)).toBe(COLOR_SCHEME.DARK);

    unmount();
    expect(remove).toHaveBeenCalled();
  });
});

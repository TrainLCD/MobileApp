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

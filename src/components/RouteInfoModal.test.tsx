import { act, render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import type { Station } from '~/@types/graphql';
import { LIGHT_APP_COLORS } from '~/constants/colorScheme';
import { appColorsAtom } from '~/store/atoms/colorScheme';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { RouteInfoModal } from './RouteInfoModal';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

// 一覧の初回レイアウト(onLoad)とスクロールの呼び出しだけを確かめたいので、
// FlashList は ref に scrollToIndex を生やし onLoad を受け取るだけの入れ物にする
const mockScrollToIndex = jest.fn();
const mockFlashListOnLoad: { current: (() => void) | null } = {
  current: null,
};
jest.mock('@shopify/flash-list', () => {
  const ReactModule = require('react');
  return {
    FlashList: ReactModule.forwardRef(
      (props: { onLoad?: () => void }, ref: React.Ref<unknown>) => {
        ReactModule.useImperativeHandle(ref, () => ({
          scrollToIndex: mockScrollToIndex,
        }));
        mockFlashListOnLoad.current = props.onLoad ?? null;
        return null;
      }
    ),
  };
});

// 実物は閉じると中身をアンマウントするので、それに合わせる
jest.mock('./CustomModal', () => ({
  CustomModal: (props: { visible: boolean; children?: React.ReactNode }) =>
    props.visible ? (props.children ?? null) : null,
}));

jest.mock('~/translation', () => ({
  isJapanese: true,
  translate: jest.fn((key: string) => key),
}));

const stations = [1, 2, 3, 4, 5].map(
  (id) =>
    ({
      id,
      groupId: id,
      name: `駅${id}`,
      nameRoman: `Station ${id}`,
      line: { id: 10 },
      lines: [{ id: 10 }],
    }) as unknown as Station
);

const renderModal = (props: {
  visible: boolean;
  currentStation: Station | null;
  stations?: Station[];
}) => (
  <RouteInfoModal
    visible={props.visible}
    trainType={null}
    stations={props.stations ?? stations}
    loading={false}
    onClose={jest.fn()}
    currentStation={props.currentStation}
  />
);

describe('RouteInfoModal', () => {
  beforeEach(() => {
    (useAtomValue as jest.Mock).mockImplementation((atom: unknown) => {
      if (atom === appColorsAtom) return LIGHT_APP_COLORS;
      if (atom === isLEDThemeAtom) return false;
      return null;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockFlashListOnLoad.current = null;
  });

  it('一覧の初回レイアウト後に現在の最寄り駅までヘッダーの高さだけずらしてスクロールする', () => {
    render(renderModal({ visible: true, currentStation: stations[3] }));
    expect(mockScrollToIndex).not.toHaveBeenCalled();

    act(() => mockFlashListOnLoad.current?.());

    expect(mockScrollToIndex).toHaveBeenCalledTimes(1);
    const [params] = mockScrollToIndex.mock.calls[0];
    expect(params.index).toBe(3);
    expect(params.animated).toBe(false);
    expect(params.viewOffset).toBeLessThan(0);
  });

  it('最寄り駅が先頭の駅ならスクロールしない', () => {
    render(renderModal({ visible: true, currentStation: stations[0] }));
    act(() => mockFlashListOnLoad.current?.());

    expect(mockScrollToIndex).not.toHaveBeenCalled();
  });

  it('最寄り駅が一覧に無ければスクロールしない', () => {
    render(
      renderModal({
        visible: true,
        currentStation: { id: 99, groupId: 99 } as Station,
      })
    );
    act(() => mockFlashListOnLoad.current?.());

    expect(mockScrollToIndex).not.toHaveBeenCalled();
  });

  it('乗換駅の行が間引かれていても groupId で同じ駅の行へスクロールする', () => {
    // 3 と 30 は同じ乗換駅。手前の区間の 3 は一覧から間引かれる
    const transferStations = [
      stations[0],
      stations[1],
      stations[2],
      { ...stations[2], id: 30 } as Station,
      stations[3],
    ];
    render(
      renderModal({
        visible: true,
        currentStation: stations[2],
        stations: transferStations,
      })
    );
    act(() => mockFlashListOnLoad.current?.());

    expect(mockScrollToIndex.mock.calls[0][0].index).toBe(2);
  });

  it('開き直すたびにもう一度スクロールする', () => {
    const { rerender } = render(
      renderModal({ visible: true, currentStation: stations[3] })
    );
    act(() => mockFlashListOnLoad.current?.());
    expect(mockScrollToIndex).toHaveBeenCalledTimes(1);

    rerender(renderModal({ visible: false, currentStation: stations[3] }));
    rerender(renderModal({ visible: true, currentStation: stations[3] }));
    // 開き直した直後は前回の onLoad を引き継がず、新しい一覧のレイアウトを待つ
    expect(mockScrollToIndex).toHaveBeenCalledTimes(1);

    act(() => mockFlashListOnLoad.current?.());
    expect(mockScrollToIndex).toHaveBeenCalledTimes(2);
  });
});

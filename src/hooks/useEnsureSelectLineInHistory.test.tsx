import { renderHook } from '@testing-library/react-native';
import { useEnsureSelectLineInHistory } from './useEnsureSelectLineInHistory';

const mockGetState = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    getState: mockGetState,
    dispatch: mockDispatch,
  }),
}));

describe('useEnsureSelectLineInHistory', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('スタックがMain単独の場合はSelectLineを履歴の下へ差し込むresetを発行する', () => {
    mockGetState.mockReturnValue({
      index: 0,
      routes: [{ key: 'Main-abc', name: 'Main', params: undefined }],
    });

    renderHook(() => useEnsureSelectLineInHistory());

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RESET',
        payload: {
          index: 1,
          routes: [
            { name: 'SelectLine' },
            // 既存のMainルートのkeyを保持して再マウントを防ぐ
            { key: 'Main-abc', name: 'Main', params: undefined },
          ],
        },
      })
    );
  });

  it('SelectLineが既に履歴へ存在する場合は何もしない', () => {
    mockGetState.mockReturnValue({
      index: 1,
      routes: [
        { key: 'SelectLine-abc', name: 'SelectLine' },
        { key: 'Main-abc', name: 'Main' },
      ],
    });

    renderHook(() => useEnsureSelectLineInHistory());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('スタックがSelectLine単独の場合は何もしない', () => {
    mockGetState.mockReturnValue({
      index: 0,
      routes: [{ key: 'SelectLine-abc', name: 'SelectLine' }],
    });

    renderHook(() => useEnsureSelectLineInHistory());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('ナビゲーション状態が取得できない場合は何もしない', () => {
    mockGetState.mockReturnValue(undefined);

    renderHook(() => useEnsureSelectLineInHistory());

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

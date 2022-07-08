import { renderHook } from '@testing-library/react-hooks';
import { useRecoilValue } from 'recoil';
import useConnectedLines from '../../src/hooks/useConnectedLines';

jest.mock('recoil');

jest.mock('../../src/hooks/useCurrentLine', () =>
  jest.fn().mockImplementation(() => ({}))
);

describe('useConnectedLines', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('行き先が選ばれてないときは空配列を返す', () => {
    (useRecoilValue as jest.Mock).mockImplementation(() => ({
      trainType: null,
      selectedBound: null,
      selectedDirection: null,
    }));

    const { result } = renderHook(() => useConnectedLines());
    expect(result.current).toEqual([]);
  });

  it('行き先が選ばれてないときは空配列を返す', () => {
    (useRecoilValue as jest.Mock).mockImplementation(() => ({
      trainType: null,
      selectedBound: null,
      selectedDirection: null,
    }));

    const { result } = renderHook(() => useConnectedLines());
    expect(result.current).toEqual([]);
  });
});

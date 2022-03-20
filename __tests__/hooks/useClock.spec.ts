import { renderHook } from '@testing-library/react-hooks';
import useClock from '../../src/hooks/useClock';

describe('useClock', () => {
  afterAll(() => {
    jest.useRealTimers();
  });

  it('現在時刻を返してくれるはず', () => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(1647018120 * 1000);

    const { result } = renderHook(() => useClock());
    expect(result.current).toEqual(['02', '02']);
  });
});

import { act, renderHook } from '@testing-library/react-native';
import { STORAGE_KEYS } from '~/constants';
import { storage } from '~/lib/storage';
import { useRideReviewWalkthrough } from './useRideReviewWalkthrough';

describe('useRideReviewWalkthrough', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('案内するカードがそろうまでは始めない', () => {
    const { result, rerender } = renderHook(
      ({ canStart }: { canStart: boolean }) =>
        useRideReviewWalkthrough(canStart),
      { initialProps: { canStart: false } }
    );
    expect(result.current.isWalkthroughActive).toBe(false);
    expect(result.current.currentStep).toBeNull();

    rerender({ canStart: true });
    expect(result.current.isWalkthroughActive).toBe(true);
    expect(result.current.currentStepId).toBe('rideReviewPeriod');
  });

  it('期間の切り替え・合計・移動経路・よく乗った路線の順に案内し、最後で完了を保存する', () => {
    const { result } = renderHook(() => useRideReviewWalkthrough(true));
    const ids = [result.current.currentStepId];
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.nextStep();
      });
      ids.push(result.current.currentStepId);
    }
    expect(ids).toEqual([
      'rideReviewPeriod',
      'rideReviewSummary',
      'rideReviewRouteMap',
      'rideReviewTopLines',
    ]);
    expect(result.current.totalSteps).toBe(4);

    act(() => {
      result.current.nextStep();
    });
    expect(result.current.isWalkthroughActive).toBe(false);
    expect(
      storage.getString(STORAGE_KEYS.RIDE_REVIEW_WALKTHROUGH_COMPLETED)
    ).toBe('true');
  });

  it('完了済みなら出さない', () => {
    storage.set(STORAGE_KEYS.RIDE_REVIEW_WALKTHROUGH_COMPLETED, 'true');
    const { result } = renderHook(() => useRideReviewWalkthrough(true));
    expect(result.current.isWalkthroughActive).toBe(false);
  });

  it('スキップでも完了を保存する', async () => {
    const { result } = renderHook(() => useRideReviewWalkthrough(true));
    await act(async () => {
      await result.current.skipWalkthrough();
    });
    expect(result.current.isWalkthroughActive).toBe(false);
    expect(
      storage.getString(STORAGE_KEYS.RIDE_REVIEW_WALKTHROUGH_COMPLETED)
    ).toBe('true');
  });

  it('ステップを移ると切り抜きの位置を消し、測り直すまで持たない', () => {
    const { result } = renderHook(() => useRideReviewWalkthrough(true));
    act(() => {
      result.current.setSpotlightArea({ x: 0, y: 100, width: 300, height: 40 });
    });
    expect(result.current.currentStep?.spotlightArea).toEqual({
      x: 0,
      y: 100,
      width: 300,
      height: 40,
    });
    act(() => {
      result.current.goToStep(2);
    });
    expect(result.current.currentStepId).toBe('rideReviewRouteMap');
    expect(result.current.currentStep?.spotlightArea).toBeUndefined();
  });

  it('保存に失敗しても閉じる', () => {
    const { result } = renderHook(() => useRideReviewWalkthrough(true));
    jest.spyOn(storage, 'set').mockImplementation(() => {
      throw new Error('Storage error');
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    act(() => {
      result.current.goToStep(3);
    });
    act(() => {
      result.current.nextStep();
    });
    expect(result.current.isWalkthroughActive).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
  });
});

import { act, renderHook } from '@testing-library/react-native';
import { STORAGE_KEYS } from '~/constants';
import { storage } from '~/lib/storage';
import { useRideReviewTabIntro } from './useRideReviewTabIntro';

describe('useRideReviewTabIntro', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('路線選択画面のウォークスルーを終えていて、案内をまだ見ていなければ出す', () => {
    storage.set(STORAGE_KEYS.WALKTHROUGH_COMPLETED, 'true');
    const { result } = renderHook(() => useRideReviewTabIntro());
    expect(result.current.isVisible).toBe(true);
  });

  it('ウォークスルーが未完了なら出さない(ウォークスルーの中で案内する)', () => {
    const { result } = renderHook(() => useRideReviewTabIntro());
    expect(result.current.isVisible).toBe(false);
  });

  it('案内を見終えていれば出さない', () => {
    storage.set(STORAGE_KEYS.WALKTHROUGH_COMPLETED, 'true');
    storage.set(STORAGE_KEYS.RIDE_REVIEW_TAB_INTRO_COMPLETED, 'true');
    const { result } = renderHook(() => useRideReviewTabIntro());
    expect(result.current.isVisible).toBe(false);
  });

  it('complete で閉じ、見終えたことを保存する', () => {
    storage.set(STORAGE_KEYS.WALKTHROUGH_COMPLETED, 'true');
    const { result } = renderHook(() => useRideReviewTabIntro());
    act(() => {
      result.current.complete();
    });
    expect(result.current.isVisible).toBe(false);
    expect(
      storage.getString(STORAGE_KEYS.RIDE_REVIEW_TAB_INTRO_COMPLETED)
    ).toBe('true');
  });

  it('保存に失敗しても閉じる', () => {
    storage.set(STORAGE_KEYS.WALKTHROUGH_COMPLETED, 'true');
    const { result } = renderHook(() => useRideReviewTabIntro());
    jest.spyOn(storage, 'set').mockImplementation(() => {
      throw new Error('Storage error');
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    act(() => {
      result.current.complete();
    });
    expect(result.current.isVisible).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
  });
});

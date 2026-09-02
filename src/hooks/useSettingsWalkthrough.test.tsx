import { act, renderHook } from '@testing-library/react-native';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';
import { useSettingsWalkthrough } from './useSettingsWalkthrough';

describe('useSettingsWalkthrough', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('設定リストの行と同じ順にスポットライトが進む', () => {
    const { result } = renderHook(() => useSettingsWalkthrough());

    const visited = [result.current.currentStepId];
    for (let i = 1; i < result.current.totalSteps; i++) {
      act(() => {
        result.current.nextStep();
      });
      visited.push(result.current.currentStepId);
    }

    expect(visited).toEqual([
      'settingsWelcome',
      'settingsTheme',
      'settingsColorScheme',
      'settingsTts',
      'settingsLanguages',
    ]);
  });

  it('最後まで進めるとウォークスルーが完了する', () => {
    const { result } = renderHook(() => useSettingsWalkthrough());

    for (let i = 0; i < result.current.totalSteps; i++) {
      act(() => {
        result.current.nextStep();
      });
    }

    expect(result.current.isWalkthroughCompleted).toBe(true);
    expect(result.current.isWalkthroughActive).toBe(false);
    expect(storage.getString(STORAGE_KEYS.SETTINGS_WALKTHROUGH_COMPLETED)).toBe(
      'true'
    );
  });

  it('完了済みならウォークスルーは起動しない', () => {
    storage.set(STORAGE_KEYS.SETTINGS_WALKTHROUGH_COMPLETED, 'true');

    const { result } = renderHook(() => useSettingsWalkthrough());

    expect(result.current.isWalkthroughActive).toBe(false);
  });
});

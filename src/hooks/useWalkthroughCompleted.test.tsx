import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ASYNC_STORAGE_KEYS } from '~/constants/asyncStorage';
import { useWalkthroughCompleted } from '~/hooks/useWalkthroughCompleted';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('useWalkthroughCompleted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('初期状態', () => {
    it('ウォークスルーが完了していない場合、isWalkthroughActiveがtrueになる', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useWalkthroughCompleted());

      await waitFor(() => {
        expect(result.current.isWalkthroughCompleted).toBe(false);
      });

      expect(result.current.isWalkthroughActive).toBe(true);
      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.currentStepId).toBe('welcome');
    });

    it('ウォークスルーが完了している場合、isWalkthroughActiveがfalseになる', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const { result } = renderHook(() => useWalkthroughCompleted());

      await waitFor(() => {
        expect(result.current.isWalkthroughCompleted).toBe(true);
      });

      expect(result.current.isWalkthroughActive).toBe(false);
      expect(result.current.currentStep).toBeNull();
      expect(result.current.currentStepId).toBeNull();
    });

    it('AsyncStorageでエラーが発生した場合、ウォークスルーを表示する', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useWalkthroughCompleted());

      await waitFor(() => {
        expect(result.current.isWalkthroughCompleted).toBe(false);
      });

      expect(result.current.isWalkthroughActive).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to check walkthrough completion status:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('ステップナビゲーション', () => {
    it('nextStepで次のステップに進む', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useWalkthroughCompleted());

      await waitFor(() => {
        expect(result.current.isWalkthroughActive).toBe(true);
      });

      expect(result.current.currentStepId).toBe('welcome');

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStepIndex).toBe(1);
      expect(result.current.currentStepId).toBe('changeLocation');

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStepIndex).toBe(2);
      expect(result.current.currentStepId).toBe('selectLine');

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStepIndex).toBe(3);
      expect(result.current.currentStepId).toBe('customize');
    });

    it('最後のステップでnextStepを呼ぶとウォークスルーが完了する', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useWalkthroughCompleted());

      await waitFor(() => {
        expect(result.current.isWalkthroughActive).toBe(true);
      });

      // 最後のステップまで進む
      act(() => {
        result.current.goToStep(3);
      });

      expect(result.current.currentStepId).toBe('customize');

      await act(async () => {
        result.current.nextStep();
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        ASYNC_STORAGE_KEYS.WALKTHROUGH_COMPLETED,
        'true'
      );
      expect(result.current.isWalkthroughCompleted).toBe(true);
    });

    it('goToStepで任意のステップに移動できる', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useWalkthroughCompleted());

      await waitFor(() => {
        expect(result.current.isWalkthroughActive).toBe(true);
      });

      act(() => {
        result.current.goToStep(2);
      });

      expect(result.current.currentStepIndex).toBe(2);
      expect(result.current.currentStepId).toBe('selectLine');

      act(() => {
        result.current.goToStep(0);
      });

      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.currentStepId).toBe('welcome');
    });

    it('無効なインデックスでgoToStepを呼んでも何も起きない', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useWalkthroughCompleted());

      await waitFor(() => {
        expect(result.current.isWalkthroughActive).toBe(true);
      });

      act(() => {
        result.current.goToStep(-1);
      });

      expect(result.current.currentStepIndex).toBe(0);

      act(() => {
        result.current.goToStep(100);
      });

      expect(result.current.currentStepIndex).toBe(0);
    });
  });

  describe('skipWalkthrough', () => {
    it('skipWalkthroughでウォークスルーを完了としてマークする', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useWalkthroughCompleted());

      await waitFor(() => {
        expect(result.current.isWalkthroughActive).toBe(true);
      });

      await act(async () => {
        await result.current.skipWalkthrough();
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        ASYNC_STORAGE_KEYS.WALKTHROUGH_COMPLETED,
        'true'
      );
      expect(result.current.isWalkthroughCompleted).toBe(true);
      expect(result.current.isWalkthroughActive).toBe(false);
    });
  });

  describe('setSpotlightArea', () => {
    it('spotlightAreaを設定できる', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useWalkthroughCompleted());

      await waitFor(() => {
        expect(result.current.isWalkthroughActive).toBe(true);
      });

      const spotlightArea = {
        x: 100,
        y: 200,
        width: 50,
        height: 50,
        borderRadius: 8,
      };

      act(() => {
        result.current.setSpotlightArea(spotlightArea);
      });

      expect(result.current.currentStep?.spotlightArea).toEqual(spotlightArea);
    });

    it('ステップ移動時にspotlightAreaがリセットされる', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useWalkthroughCompleted());

      await waitFor(() => {
        expect(result.current.isWalkthroughActive).toBe(true);
      });

      act(() => {
        result.current.setSpotlightArea({
          x: 100,
          y: 200,
          width: 50,
          height: 50,
        });
      });

      expect(result.current.currentStep?.spotlightArea).toBeDefined();

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStep?.spotlightArea).toBeUndefined();
    });
  });

  describe('currentStep', () => {
    it('各ステップに正しいtitleKeyとdescriptionKeyが設定されている', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useWalkthroughCompleted());

      await waitFor(() => {
        expect(result.current.isWalkthroughActive).toBe(true);
      });

      // Step 0: welcome
      expect(result.current.currentStep?.id).toBe('welcome');
      expect(result.current.currentStep?.titleKey).toBe('walkthroughTitle1');
      expect(result.current.currentStep?.descriptionKey).toBe(
        'walkthroughDescription1'
      );

      // Step 1: changeLocation
      act(() => {
        result.current.nextStep();
      });
      expect(result.current.currentStep?.id).toBe('changeLocation');
      expect(result.current.currentStep?.titleKey).toBe('walkthroughTitle2');

      // Step 2: selectLine
      act(() => {
        result.current.nextStep();
      });
      expect(result.current.currentStep?.id).toBe('selectLine');
      expect(result.current.currentStep?.titleKey).toBe('walkthroughTitle3');

      // Step 3: customize
      act(() => {
        result.current.nextStep();
      });
      expect(result.current.currentStep?.id).toBe('customize');
      expect(result.current.currentStep?.titleKey).toBe('walkthroughTitle4');
    });

    it('totalStepsが正しい値を返す', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useWalkthroughCompleted());

      await waitFor(() => {
        expect(result.current.isWalkthroughActive).toBe(true);
      });

      expect(result.current.totalSteps).toBe(4);
    });
  });

  describe('エラーハンドリング', () => {
    it('completeWalkthroughでAsyncStorageエラーが発生しても例外をスローしない', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useWalkthroughCompleted());

      await waitFor(() => {
        expect(result.current.isWalkthroughActive).toBe(true);
      });

      // 最後のステップに移動してnextStepを呼ぶ
      act(() => {
        result.current.goToStep(3);
      });

      await act(async () => {
        result.current.nextStep();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save walkthrough completion status:',
        expect.any(Error)
      );
      // エラーが発生してもisWalkthroughCompletedはfalseのまま
      expect(result.current.isWalkthroughCompleted).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});

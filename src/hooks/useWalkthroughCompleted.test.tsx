import { act, renderHook } from '@testing-library/react-native';
import { STORAGE_KEYS } from '~/constants/storage';
import { useWalkthroughCompleted } from '~/hooks/useWalkthroughCompleted';
import { storage } from '~/lib/storage';

describe('useWalkthroughCompleted', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初期状態', () => {
    it('ウォークスルーが完了していない場合、isWalkthroughActiveがtrueになる', () => {
      const { result } = renderHook(() => useWalkthroughCompleted());

      expect(result.current.isWalkthroughCompleted).toBe(false);
      expect(result.current.isWalkthroughActive).toBe(true);
      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.currentStepId).toBe('welcome');
    });

    it('ウォークスルーが完了している場合、isWalkthroughActiveがfalseになる', () => {
      storage.set(STORAGE_KEYS.WALKTHROUGH_COMPLETED, 'true');

      const { result } = renderHook(() => useWalkthroughCompleted());

      expect(result.current.isWalkthroughCompleted).toBe(true);
      expect(result.current.isWalkthroughActive).toBe(false);
      expect(result.current.currentStep).toBeNull();
      expect(result.current.currentStepId).toBeNull();
    });
  });

  describe('ステップナビゲーション', () => {
    it('nextStepで次のステップに進む', () => {
      const { result } = renderHook(() => useWalkthroughCompleted());

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
      expect(result.current.currentStepId).toBe('savedRoutes');

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStepIndex).toBe(4);
      expect(result.current.currentStepId).toBe('routeSearch');

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStepIndex).toBe(5);
      expect(result.current.currentStepId).toBe('customize');
    });

    it('最後のステップでnextStepを呼ぶとウォークスルーが完了する', () => {
      const { result } = renderHook(() => useWalkthroughCompleted());

      // 最後のステップまで進む
      act(() => {
        result.current.goToStep(5);
      });

      expect(result.current.currentStepId).toBe('customize');

      act(() => {
        result.current.nextStep();
      });

      expect(storage.getString(STORAGE_KEYS.WALKTHROUGH_COMPLETED)).toBe(
        'true'
      );
      expect(result.current.isWalkthroughCompleted).toBe(true);
    });

    it('goToStepで任意のステップに移動できる', () => {
      const { result } = renderHook(() => useWalkthroughCompleted());

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

    it('無効なインデックスでgoToStepを呼んでも何も起きない', () => {
      const { result } = renderHook(() => useWalkthroughCompleted());

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
      const { result } = renderHook(() => useWalkthroughCompleted());

      expect(result.current.isWalkthroughActive).toBe(true);

      await act(async () => {
        await result.current.skipWalkthrough();
      });

      expect(storage.getString(STORAGE_KEYS.WALKTHROUGH_COMPLETED)).toBe(
        'true'
      );
      expect(result.current.isWalkthroughCompleted).toBe(true);
      expect(result.current.isWalkthroughActive).toBe(false);
    });
  });

  describe('setSpotlightArea', () => {
    it('spotlightAreaを設定できる', () => {
      const { result } = renderHook(() => useWalkthroughCompleted());

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

    it('ステップ移動時にspotlightAreaがリセットされる', () => {
      const { result } = renderHook(() => useWalkthroughCompleted());

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
    it('各ステップに正しいtitleKeyとdescriptionKeyが設定されている', () => {
      const { result } = renderHook(() => useWalkthroughCompleted());

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

      // Step 3: savedRoutes
      act(() => {
        result.current.nextStep();
      });
      expect(result.current.currentStep?.id).toBe('savedRoutes');
      expect(result.current.currentStep?.titleKey).toBe('walkthroughTitle5');

      // Step 4: routeSearch
      act(() => {
        result.current.nextStep();
      });
      expect(result.current.currentStep?.id).toBe('routeSearch');
      expect(result.current.currentStep?.titleKey).toBe('walkthroughTitle6');

      // Step 5: customize
      act(() => {
        result.current.nextStep();
      });
      expect(result.current.currentStep?.id).toBe('customize');
      expect(result.current.currentStep?.titleKey).toBe('walkthroughTitle4');
    });

    it('totalStepsが正しい値を返す', () => {
      const { result } = renderHook(() => useWalkthroughCompleted());

      expect(result.current.totalSteps).toBe(6);
    });
  });

  describe('エラーハンドリング', () => {
    it('completeWalkthroughでストレージエラーが発生しても例外をスローしない', () => {
      const setSpy = jest.spyOn(storage, 'set').mockImplementation(() => {
        throw new Error('Storage error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useWalkthroughCompleted());

      // 最後のステップに移動してnextStepを呼ぶ
      act(() => {
        result.current.goToStep(5);
      });

      act(() => {
        result.current.nextStep();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save walkthrough completion status:',
        expect.any(Error)
      );
      // 楽観的更新により、ストレージエラーが発生してもUIは閉じる
      expect(result.current.isWalkthroughCompleted).toBe(true);
      expect(result.current.isWalkthroughActive).toBe(false);

      setSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});

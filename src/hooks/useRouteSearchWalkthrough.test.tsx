import { act, renderHook } from '@testing-library/react-native';
import { STORAGE_KEYS } from '~/constants/storage';
import { useRouteSearchWalkthrough } from '~/hooks/useRouteSearchWalkthrough';
import { storage } from '~/lib/storage';

describe('useRouteSearchWalkthrough', () => {
  it('AIエージェント有効時はバナー紹介を検索バーと検索結果の間に表示する', () => {
    const { result } = renderHook(() => useRouteSearchWalkthrough(true));

    expect(result.current.totalSteps).toBe(4);

    act(() => result.current.nextStep());
    expect(result.current.currentStepId).toBe('routeSearchBar');

    act(() => result.current.nextStep());
    expect(result.current.currentStep).toMatchObject({
      id: 'routeSearchAgentBanner',
      titleKey: 'routeSearchWalkthroughAgentTitle',
      descriptionKey: 'routeSearchWalkthroughAgentDescription',
    });

    act(() => result.current.nextStep());
    expect(result.current.currentStepId).toBe('routeSearchResults');
  });

  it('AIエージェント無効時はバナー紹介を省略する', () => {
    const { result } = renderHook(() => useRouteSearchWalkthrough(false));

    expect(result.current.totalSteps).toBe(3);

    act(() => result.current.goToStep(2));
    expect(result.current.currentStepId).toBe('routeSearchResults');
  });

  it('AIエージェント有効時の最終ステップで完了状態を保存する', () => {
    const { result } = renderHook(() => useRouteSearchWalkthrough(true));

    act(() => result.current.goToStep(3));
    act(() => result.current.nextStep());

    expect(
      storage.getString(STORAGE_KEYS.ROUTE_SEARCH_WALKTHROUGH_COMPLETED)
    ).toBe('true');
    expect(result.current.isWalkthroughCompleted).toBe(true);
    expect(result.current.isWalkthroughActive).toBe(false);
  });
});

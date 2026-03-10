import { CommonActions } from '@react-navigation/native';
import * as QuickActions from 'expo-quick-actions';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { navigationRef } from '~/stacks/rootNavigation';
import navigationState from '~/store/atoms/navigation';

const MAX_QUICK_ACTIONS = 4;

let handledInitial = false;

const navigateToSelectLine = () => {
  if (!navigationRef.isReady()) {
    console.warn(
      'useQuickActions: ナビゲーションが未準備のためクイックアクションをスキップ'
    );
    return false;
  }

  ScreenOrientation.unlockAsync().catch(console.error);

  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'MainStack',
      params: { screen: 'SelectLine' },
    })
  );
  return true;
};

/**
 * アプリルートで使用するフック。
 * - presetRoutes をOSのクイックアクションに同期
 * - クイックアクション選択時に pendingQuickActionRouteId を設定し、SelectLine に遷移
 */
export const useQuickActions = () => {
  const { presetRoutes } = useAtomValue(navigationState);
  const setNavigationState = useSetAtom(navigationState);

  // プリセットが変わるたびにOSのクイックアクションを同期
  useEffect(() => {
    const syncItems = async () => {
      if (!(await QuickActions.isSupported())) return;
      await QuickActions.setItems(
        presetRoutes.slice(0, MAX_QUICK_ACTIONS).map((route) => ({
          id: route.id,
          title: route.name,
          icon: Platform.OS === 'ios' ? 'symbol:tram.fill' : undefined,
          params: { routeId: route.id },
        }))
      );
    };
    syncItems().catch((err) =>
      console.warn('useQuickActions: クイックアクション同期に失敗', err)
    );
  }, [presetRoutes]);

  // クイックアクション選択を監視
  useEffect(() => {
    const handleAction = (action: QuickActions.Action | null) => {
      const routeId = action?.params?.routeId;
      if (typeof routeId !== 'string') return;

      setNavigationState((prev) => ({
        ...prev,
        pendingQuickActionRouteId: routeId,
      }));

      if (!navigateToSelectLine()) {
        setNavigationState((prev) => ({
          ...prev,
          pendingQuickActionRouteId: null,
        }));
      }
    };

    // コールドスタート時（リマウントでの重複処理を防止）
    if (QuickActions.initial && !handledInitial) {
      handledInitial = true;
      handleAction(QuickActions.initial);
    }

    // ウォームスタート時
    const subscription = QuickActions.addListener(handleAction);
    return () => subscription.remove();
  }, [setNavigationState]);
};

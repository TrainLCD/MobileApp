import { CommonActions } from '@react-navigation/native';
import * as QuickActions from 'expo-quick-actions';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { navigationRef } from '~/stacks/rootNavigation';
import navigationState from '~/store/atoms/navigation';

const MAX_QUICK_ACTIONS = 4;

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
    QuickActions.setItems(
      presetRoutes.slice(0, MAX_QUICK_ACTIONS).map((route) => ({
        id: route.id,
        title: route.name,
        icon: Platform.OS === 'ios' ? 'symbol:tram.fill' : undefined,
        params: { routeId: route.id },
      }))
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

      // どの画面にいても SelectLine に遷移させる
      if (navigationRef.isReady()) {
        navigationRef.dispatch(
          CommonActions.navigate({
            name: 'MainStack',
            params: { screen: 'SelectLine' },
          })
        );
      }
    };

    // コールドスタート時
    if (QuickActions.initial) {
      handleAction(QuickActions.initial);
    }

    // ウォームスタート時
    const subscription = QuickActions.addListener(handleAction);
    return () => subscription.remove();
  }, [setNavigationState]);
};

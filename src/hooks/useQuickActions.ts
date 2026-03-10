import * as QuickActions from 'expo-quick-actions';
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import type { SavedRoute } from '~/models/SavedRoute';
import navigationState from '~/store/atoms/navigation';

const MAX_QUICK_ACTIONS = 4;

const buildQuickActionItems = (routes: SavedRoute[]): QuickActions.Action[] => {
  return routes.slice(0, MAX_QUICK_ACTIONS).map((route) => ({
    id: route.id,
    title: route.name,
    icon: Platform.OS === 'ios' ? 'symbol:tram.fill' : undefined,
    params: { routeId: route.id },
  }));
};

export const useQuickActions = (routes: SavedRoute[]) => {
  const setNavigationState = useSetAtom(navigationState);

  // プリセットが変わるたびにOSのクイックアクションを同期
  useEffect(() => {
    QuickActions.setItems(buildQuickActionItems(routes));
  }, [routes]);

  // クイックアクション選択を監視
  useEffect(() => {
    const handleAction = (action: QuickActions.Action | null) => {
      const routeId = action?.params?.routeId;
      if (typeof routeId !== 'string') return;
      setNavigationState((prev) => ({
        ...prev,
        pendingQuickActionRouteId: routeId,
      }));
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

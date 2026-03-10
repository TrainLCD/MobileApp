import { CommonActions } from '@react-navigation/native';
import * as QuickActions from 'expo-quick-actions';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { navigationRef } from '~/stacks/rootNavigation';
import navigationState from '~/store/atoms/navigation';

const MAX_QUICK_ACTIONS = 4;
const MAX_NAV_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 100;

let handledInitial = false;

const navigateToSelectLine = async () => {
  const waitForNavReady = (): Promise<boolean> =>
    new Promise((resolve) => {
      let attempt = 0;
      const check = () => {
        if (navigationRef.isReady()) {
          resolve(true);
          return;
        }
        attempt++;
        if (attempt >= MAX_NAV_RETRIES) {
          resolve(false);
          return;
        }
        setTimeout(check, INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1));
      };
      check();
    });

  const ready = navigationRef.isReady() || (await waitForNavReady());
  if (ready) {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: 'MainStack',
        params: { screen: 'SelectLine' },
      })
    );
  }
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

      navigateToSelectLine();
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

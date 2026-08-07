import { CommonActions } from '@react-navigation/native';
import { navigationRef } from '~/stacks/rootNavigation';

/**
 * 路線選択画面へリセット遷移する。
 *
 * プリセットの起動経路(クイックアクション / ホーム画面ウィジェットのディープリンク)は
 * どちらも「路線選択画面へ戻してからプリセットを適用する」流れのため共通化している。
 *
 * @returns ナビゲーションが未準備で遷移できなかった場合は false
 */
export const navigateToSelectLine = (): boolean => {
  if (!navigationRef.isReady()) {
    return false;
  }

  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'MainStack', params: { screen: 'SelectLine' } }],
    })
  );
  return true;
};

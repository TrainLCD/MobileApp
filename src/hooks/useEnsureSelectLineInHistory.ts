import { CommonActions, useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';

// Android で Activity が再生成されると、JS ランタイム（Jotai の selectedBound）は
// 生存したまま React ツリーだけが作り直される。このとき MainStack は
// initialRouteName='Main' で初期化されるため履歴に SelectLine が存在せず、
// 戻る操作が pop できずアプリがバックグラウンドへ落ちてしまう。
// スタックが Main 単独で初期化された場合に限り、既存の Main ルートのキーを
// 保持したまま（Main を再マウントさせず beforeRemove も発火させずに）
// SelectLine を履歴の下へ差し込み、通常どおり戻れる状態へ復元する。
export const useEnsureSelectLineInHistory = (): void => {
  const navigation = useNavigation();

  useEffect(() => {
    const state = navigation.getState();
    if (
      !state ||
      state.routes.length !== 1 ||
      state.routes[0]?.name !== 'Main'
    ) {
      return;
    }

    const mainRoute = state.routes[0];
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'SelectLine' },
          // key を引き継ぐことで Main は再マウントされず beforeRemove も発火しない
          {
            key: mainRoute.key,
            name: mainRoute.name,
            params: mainRoute.params,
          },
        ],
      })
    );
  }, [navigation]);
};

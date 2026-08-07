import { memo, type ReactNode, useEffect } from 'react';
import { useDeepLink } from '../hooks/useDeepLink';
import { translate } from '../translation';
import { showDialogWhilePresenting } from '../utils/dialogPresentation';

type Props = {
  children: ReactNode;
};

const DeepLinkProvider = ({ children }: Props) => {
  const { initialUrlProcessed, error } = useDeepLink();
  useEffect(() => {
    if (error) {
      console.error(error);
      showDialogWhilePresenting(
        'deepLinkFetchStationError',
        translate('errorTitle'),
        translate('failedToFetchStation')
      );
    }
  }, [error]);
  // ゲートは初期URLの処理完了までに限定する。initialUrlProcessed は
  // handleUrl の await 完了後（=初期リンクのフェッチ解決後）に立つため、
  // 初回起動のちらつき防止はこれだけで足りる。isLoading を条件に含めると、
  // 稼働中に受けたランタイムディープリンクの解決中もツリー全体が null になり、
  // 表示中の画面が一瞬消えてナビゲーション状態も破棄されてしまう。
  if (!initialUrlProcessed) {
    return null;
  }

  return children;
};

export default memo(DeepLinkProvider);

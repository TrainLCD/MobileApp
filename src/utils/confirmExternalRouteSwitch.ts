import { getLineSymbolImage } from '~/lineSymbolImage';
import type { SavedRoute } from '~/models/SavedRoute';
import { navigationRef } from '~/stacks/rootNavigation';
import { translate } from '~/translation';
import { showDialogWhilePresenting } from './dialogPresentation';

/**
 * 外部からの経路変更は、走行画面を開いている間だけ確認します。
 * 設定画面などを重ねている場合も、背後の走行中の経路を保護します。
 * コールドスタートではナビゲーションが未準備のため、そのまま適用します。
 */
export const confirmExternalRouteSwitch = (
  preset?: Pick<SavedRoute, 'name' | 'lineId'>
): Promise<boolean> => {
  const mainStack = navigationRef.isReady()
    ? navigationRef
        .getRootState()
        ?.routes.find((route) => route.name === 'MainStack')
    : undefined;
  if (!mainStack?.state?.routes.some((route) => route.name === 'Main')) {
    return Promise.resolve(true);
  }

  const image = preset
    ? getLineSymbolImage({ id: preset.lineId }, false)?.signPath
    : undefined;

  return new Promise((resolve) => {
    const shown = showDialogWhilePresenting(
      'confirmExternalRouteSwitch',
      preset?.name
        ? translate('confirmPresetRouteSwitchTitle', {
            presetName: preset.name,
          })
        : translate('confirmExternalRouteSwitchTitle'),
      translate('confirmExternalRouteSwitchMessage'),
      [
        {
          text: translate('cancel'),
          style: 'cancel',
          onPress: () => resolve(false),
        },
        { text: translate('switchRoute'), onPress: () => resolve(true) },
      ],
      {
        lineSymbol: image !== undefined ? { image } : undefined,
        onDismiss: () => resolve(false),
      }
    );
    // 同時に届いたリンクやStrictModeの再実行で確認を重ねません。
    if (!shown) resolve(false);
  });
};

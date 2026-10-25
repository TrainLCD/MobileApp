import { atom } from 'jotai';
import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';

// #7255の既定動作を維持し、比較するときだけ10m制限へ戻す。
// 保存に成功してから通知し、失敗時は表示も実効設定も変更しない。
const enabledAtom = atom(
  storage.getString(STORAGE_KEYS.IOS_BACKGROUND_DISTANCE_FILTER_BYPASS) !==
    'false'
);

export const iosBackgroundDistanceFilterBypassAtom = atom(
  (get) => get(enabledAtom),
  (_get, set, enabled: boolean) => {
    storage.set(
      STORAGE_KEYS.IOS_BACKGROUND_DISTANCE_FILTER_BYPASS,
      String(enabled)
    );
    set(enabledAtom, enabled);
  }
);

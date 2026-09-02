import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';

/** 走行画面のプロンプト(案A)を出す通算上限 */
export const PORTRAIT_PROMPT_MAX_COUNT = 2;

/** 「今はしない」で閉じたあと、次に出すまで空ける時間 */
export const PORTRAIT_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** ホームのバナー(案B)を出す通算上限 */
export const PORTRAIT_BANNER_MAX_COUNT = 3;

const readFlag = (key: string): boolean => {
  try {
    return storage.getString(key) === 'true';
  } catch (error) {
    console.error('Failed to read portrait promo flag', error);
    return false;
  }
};

const readCounter = (key: string): number => {
  try {
    const raw = storage.getString(key);
    if (!raw) {
      return 0;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch (error) {
    console.error('Failed to read portrait promo counter', error);
    return 0;
  }
};

// 訴求の記録は落としても実害が無い(せいぜい1回多く出る)ため、
// 保存に失敗しても呼び出し側にはエラーを伝播させない。
const write = (key: string, value: string): void => {
  try {
    storage.set(key, value);
  } catch (error) {
    console.error('Failed to save portrait promo state', error);
  }
};

/** 訴求を打ち切ったか。ポートレートモードを一度オンにすると立つ */
export const isPortraitPromoFinished = (): boolean =>
  readFlag(STORAGE_KEYS.PORTRAIT_PROMO_FINISHED);

/**
 * 訴求を恒久的に打ち切る。オンにした時点で案A・案B・案Cのすべてを止める。
 * あとから設定でオフに戻しても復活させない。
 */
export const finishPortraitPromo = (): void => {
  write(STORAGE_KEYS.PORTRAIT_PROMO_FINISHED, 'true');
};

/** 走行画面のプロンプト(案A)を出してよいか */
export const canShowPortraitPrompt = (now: number = Date.now()): boolean => {
  if (isPortraitPromoFinished()) {
    return false;
  }
  if (
    readCounter(STORAGE_KEYS.PORTRAIT_PROMO_PROMPT_COUNT) >=
    PORTRAIT_PROMPT_MAX_COUNT
  ) {
    return false;
  }
  const lastShownAt = readCounter(
    STORAGE_KEYS.PORTRAIT_PROMO_PROMPT_LAST_SHOWN_AT
  );
  if (!lastShownAt) {
    return true;
  }
  return now - lastShownAt >= PORTRAIT_PROMPT_COOLDOWN_MS;
};

/** 「今はしない」で閉じられたことを記録し、次に出すまでの間隔を空ける */
export const recordPortraitPromptDismissed = (
  now: number = Date.now()
): void => {
  const count = readCounter(STORAGE_KEYS.PORTRAIT_PROMO_PROMPT_COUNT);
  write(STORAGE_KEYS.PORTRAIT_PROMO_PROMPT_COUNT, String(count + 1));
  write(STORAGE_KEYS.PORTRAIT_PROMO_PROMPT_LAST_SHOWN_AT, String(now));
};

/** ホームのバナー(案B)を出してよいか */
export const canShowPortraitBanner = (): boolean => {
  if (isPortraitPromoFinished()) {
    return false;
  }
  return (
    readCounter(STORAGE_KEYS.PORTRAIT_PROMO_BANNER_COUNT) <
    PORTRAIT_BANNER_MAX_COUNT
  );
};

/** バナーを1回表示したことを記録する */
export const recordPortraitBannerShown = (): void => {
  const count = readCounter(STORAGE_KEYS.PORTRAIT_PROMO_BANNER_COUNT);
  write(STORAGE_KEYS.PORTRAIT_PROMO_BANNER_COUNT, String(count + 1));
};

/**
 * 設定リストの印とスポットライト(案C)を出してよいか。
 * 外観画面を一度開いた時点で両方とも消える。
 */
export const canShowPortraitAppearanceHint = (): boolean => {
  if (isPortraitPromoFinished()) {
    return false;
  }
  return !readFlag(STORAGE_KEYS.PORTRAIT_PROMO_APPEARANCE_SEEN);
};

/** 外観画面を開いたことを記録する */
export const markPortraitAppearanceSeen = (): void => {
  write(STORAGE_KEYS.PORTRAIT_PROMO_APPEARANCE_SEEN, 'true');
};

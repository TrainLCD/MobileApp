import { STORAGE_KEYS } from '~/constants/storage';
import { storage } from '~/lib/storage';
import {
  canShowPortraitAppearanceHint,
  canShowPortraitBanner,
  canShowPortraitPrompt,
  finishPortraitPromo,
  isPortraitPromoFinished,
  markPortraitAppearanceSeen,
  PORTRAIT_BANNER_MAX_COUNT,
  PORTRAIT_PROMPT_COOLDOWN_MS,
  PORTRAIT_PROMPT_MAX_COUNT,
  recordPortraitBannerShown,
  recordPortraitPromptDismissed,
} from './portraitPromo';

describe('portraitPromo', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('finishPortraitPromo', () => {
    it('打ち切りフラグを立てるとすべての訴求が止まる', () => {
      expect(isPortraitPromoFinished()).toBe(false);
      expect(canShowPortraitPrompt()).toBe(true);
      expect(canShowPortraitBanner()).toBe(true);
      expect(canShowPortraitAppearanceHint()).toBe(true);

      finishPortraitPromo();

      expect(isPortraitPromoFinished()).toBe(true);
      expect(canShowPortraitPrompt()).toBe(false);
      expect(canShowPortraitBanner()).toBe(false);
      expect(canShowPortraitAppearanceHint()).toBe(false);
    });
  });

  describe('canShowPortraitPrompt', () => {
    it('未提示なら出せる', () => {
      expect(canShowPortraitPrompt()).toBe(true);
    });

    it('「今はしない」の直後はクールダウン中なので出さない', () => {
      const now = 1_700_000_000_000;
      recordPortraitPromptDismissed(now);

      expect(canShowPortraitPrompt(now + 1000)).toBe(false);
      expect(canShowPortraitPrompt(now + PORTRAIT_PROMPT_COOLDOWN_MS - 1)).toBe(
        false
      );
    });

    it('クールダウンを過ぎたら再度出せる', () => {
      const now = 1_700_000_000_000;
      recordPortraitPromptDismissed(now);

      expect(canShowPortraitPrompt(now + PORTRAIT_PROMPT_COOLDOWN_MS)).toBe(
        true
      );
    });

    it('上限回数まで出したら、クールダウンを過ぎても出さない', () => {
      const now = 1_700_000_000_000;
      for (let i = 0; i < PORTRAIT_PROMPT_MAX_COUNT; i++) {
        recordPortraitPromptDismissed(now + i);
      }

      expect(
        canShowPortraitPrompt(now + PORTRAIT_PROMPT_COOLDOWN_MS * 10)
      ).toBe(false);
    });
  });

  describe('canShowPortraitBanner', () => {
    it('上限回数まで表示したら出さない', () => {
      for (let i = 0; i < PORTRAIT_BANNER_MAX_COUNT; i++) {
        expect(canShowPortraitBanner()).toBe(true);
        recordPortraitBannerShown();
      }

      expect(canShowPortraitBanner()).toBe(false);
    });
  });

  describe('canShowPortraitAppearanceHint', () => {
    it('外観画面を一度開いたら印を出さない', () => {
      expect(canShowPortraitAppearanceHint()).toBe(true);

      markPortraitAppearanceSeen();

      expect(canShowPortraitAppearanceHint()).toBe(false);
    });
  });

  it('壊れたカウンタ値は0として扱う', () => {
    storage.set(STORAGE_KEYS.PORTRAIT_PROMO_BANNER_COUNT, 'not-a-number');

    expect(canShowPortraitBanner()).toBe(true);
  });
});

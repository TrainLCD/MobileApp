import type { AvailableLanguage } from '../../constants';
import { shouldUseEnglishLineBoard } from './isEn';

describe('shouldUseEnglishLineBoard', () => {
  it('headerStateが_ENなら英語表示にする', () => {
    const enabledLanguages: AvailableLanguage[] = ['JA', 'ZH', 'KO'];
    expect(shouldUseEnglishLineBoard('CURRENT_EN', enabledLanguages)).toBe(
      true
    );
  });

  it('headerStateが_ZHかつEN有効なら英語表示にする', () => {
    const enabledLanguages: AvailableLanguage[] = ['JA', 'EN', 'ZH'];
    expect(shouldUseEnglishLineBoard('CURRENT_ZH', enabledLanguages)).toBe(
      true
    );
  });

  it('headerStateが_ZHかつEN無効なら英語表示にしない', () => {
    const enabledLanguages: AvailableLanguage[] = ['JA', 'ZH', 'KO'];
    expect(shouldUseEnglishLineBoard('CURRENT_ZH', enabledLanguages)).toBe(
      false
    );
  });

  it('headerStateが_KOなら英語表示にしない', () => {
    const enabledLanguages: AvailableLanguage[] = ['JA', 'EN', 'ZH', 'KO'];
    expect(shouldUseEnglishLineBoard('CURRENT_KO', enabledLanguages)).toBe(
      false
    );
  });
});

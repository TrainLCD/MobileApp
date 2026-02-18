import type { AvailableLanguage } from '~/constants';
import {
  getToggledEnabledLanguages,
  isLanguageToggleDisabled,
  normalizeEnabledLanguages,
} from './enabledLanguages';

describe('EnabledLanguagesSettings logic', () => {
  describe('isLanguageToggleDisabled', () => {
    it('allows toggling JA and EN when both are enabled', () => {
      const enabledLanguages: AvailableLanguage[] = ['JA', 'EN', 'ZH', 'KO'];

      expect(isLanguageToggleDisabled(enabledLanguages, 'JA', true)).toBe(
        false
      );
      expect(isLanguageToggleDisabled(enabledLanguages, 'EN', true)).toBe(
        false
      );
    });

    it('disables JA toggle off when EN is already disabled', () => {
      const enabledLanguages: AvailableLanguage[] = ['JA', 'ZH', 'KO'];

      expect(isLanguageToggleDisabled(enabledLanguages, 'JA', true)).toBe(true);
    });

    it('disables EN toggle off when JA is already disabled', () => {
      const enabledLanguages: AvailableLanguage[] = ['EN', 'ZH', 'KO'];

      expect(isLanguageToggleDisabled(enabledLanguages, 'EN', true)).toBe(true);
    });

    it('never disables ZH/KO toggles by JA/EN constraints', () => {
      const enabledLanguages: AvailableLanguage[] = ['EN', 'ZH', 'KO'];

      expect(isLanguageToggleDisabled(enabledLanguages, 'ZH', true)).toBe(
        false
      );
      expect(isLanguageToggleDisabled(enabledLanguages, 'KO', true)).toBe(
        false
      );
    });
  });

  describe('language ordering', () => {
    it('normalizes enabled languages by predefined priority', () => {
      expect(normalizeEnabledLanguages(['KO', 'JA', 'ZH'])).toEqual([
        'JA',
        'ZH',
        'KO',
      ]);
    });

    it('keeps order stable after toggling on', () => {
      expect(getToggledEnabledLanguages(['JA', 'KO'], 'EN')).toEqual([
        'JA',
        'EN',
        'KO',
      ]);
    });

    it('keeps order stable after toggling off', () => {
      expect(
        getToggledEnabledLanguages(['JA', 'EN', 'ZH', 'KO'], 'EN')
      ).toEqual(['JA', 'ZH', 'KO']);
    });
  });
});

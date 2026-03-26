import { getTrainTypeTextColor } from './trainTypeTextColor';

describe('getTrainTypeTextColor', () => {
  describe('暗い背景色の場合、白テキストを返す', () => {
    it('青 (#008ffe)', () => {
      expect(getTrainTypeTextColor('#008ffe')).toBe('#fff');
    });

    it('濃い緑 (#006400)', () => {
      expect(getTrainTypeTextColor('#006400')).toBe('#fff');
    });

    it('赤 (#e60012)', () => {
      expect(getTrainTypeTextColor('#e60012')).toBe('#fff');
    });

    it('黒 (#000000)', () => {
      expect(getTrainTypeTextColor('#000000')).toBe('#fff');
    });
  });

  describe('明るい背景色の場合、暗いテキストを返す', () => {
    it('黄色 (#FFD700)', () => {
      expect(getTrainTypeTextColor('#FFD700')).toBe('#333');
    });

    it('薄い黄色 (#FFFF00)', () => {
      expect(getTrainTypeTextColor('#FFFF00')).toBe('#333');
    });

    it('白 (#FFFFFF)', () => {
      expect(getTrainTypeTextColor('#FFFFFF')).toBe('#333');
    });

    it('薄いオレンジ (#FFA500)', () => {
      expect(getTrainTypeTextColor('#FFA500')).toBe('#333');
    });
  });

  describe('エッジケース', () => {
    it('undefinedの場合、フォールバック色(#008ffe)に基づいて白を返す', () => {
      expect(getTrainTypeTextColor(undefined)).toBe('#fff');
    });

    it('空文字の場合、フォールバック色に基づいて白を返す', () => {
      expect(getTrainTypeTextColor('')).toBe('#fff');
    });

    it('不正な色コードの場合、白にフォールバックする', () => {
      expect(getTrainTypeTextColor('invalid')).toBe('#fff');
    });
  });
});

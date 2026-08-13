import { fixJrReading } from './jrReading';

describe('fixJrReading', () => {
  describe('日本語', () => {
    it('路線名の「JR」をカタカナ読みへ置換する', () => {
      expect(fixJrReading('次は、JR神戸線です。', 'JA')).toBe(
        '次は、ジェーアール神戸線です。'
      );
    });

    it('会社名の「JR」もカタカナ読みへ置換する', () => {
      expect(fixJrReading('今日も、JR東日本をご利用くださいまして', 'JA')).toBe(
        '今日も、ジェーアール東日本をご利用くださいまして'
      );
    });

    it('1文中の複数箇所をすべて置換する', () => {
      expect(fixJrReading('JR線とJR神戸線', 'JA')).toBe(
        'ジェーアール線とジェーアール神戸線'
      );
    });

    it('全角の「ＪＲ」も置換する', () => {
      expect(fixJrReading('ＪＲ線', 'JA')).toBe('ジェーアール線');
    });
  });

  describe('英語', () => {
    it('「JR」をアルファベット読みさせる表記へ置換する', () => {
      expect(fixJrReading('the JR Kobe Line', 'EN')).toBe('the J-R Kobe Line');
    });

    it('文末など後続文字が英数字でない場合も置換する', () => {
      expect(fixJrReading('Thank you for using JR.', 'EN')).toBe(
        'Thank you for using J-R.'
      );
    });
  });

  describe('誤置換の防止', () => {
    it('前後が英数字の場合は別語の一部とみなして置換しない', () => {
      expect(fixJrReading('AJRB', 'JA')).toBe('AJRB');
      expect(fixJrReading('JR2', 'EN')).toBe('JR2');
    });

    it('小文字の「Jr」は置換しない', () => {
      expect(fixJrReading('Jr.', 'EN')).toBe('Jr.');
    });

    it('「JR」を含まないテキストはそのまま返す', () => {
      expect(fixJrReading('次は、渋谷、渋谷。', 'JA')).toBe(
        '次は、渋谷、渋谷。'
      );
    });
  });
});

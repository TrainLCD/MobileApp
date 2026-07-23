import { ssmlToPlainText } from './ssmlToPlainText';

describe('ssmlToPlainText', () => {
  it('break タグを既定で読点に置き換える', () => {
    expect(ssmlToPlainText('大崎<break time="250ms"/>品川方面')).toBe(
      '大崎、品川方面'
    );
  });

  it('break タグを指定した区切り文字に置き換える', () => {
    expect(
      ssmlToPlainText(
        'the Yamanote Line,<break time="200ms"/> and the Saikyo Line',
        {
          breakReplacement: ' ',
        }
      )
    ).toBe('the Yamanote Line, and the Saikyo Line');
  });

  it('phoneme タグは中身の表記テキストを残す', () => {
    expect(
      ssmlToPlainText(
        'The next station is <phoneme alphabet="ipa" ph="oːsaki">Osaki</phoneme>.'
      )
    ).toBe('The next station is Osaki.');
  });

  it('say-as タグは中身の数値を残す', () => {
    expect(
      ssmlToPlainText('J Y <say-as interpret-as="cardinal">24</say-as>.')
    ).toBe('J Y 24.');
  });

  it('escapeXml 済みの実体参照を元の文字へ戻す', () => {
    expect(ssmlToPlainText('Meguro &amp; Ebisu &lt;test&gt;')).toBe(
      'Meguro & Ebisu <test>'
    );
  });

  it('タグ除去で生じた連続スペースを1つにまとめる', () => {
    expect(
      ssmlToPlainText(
        'bound for <phoneme alphabet="ipa" ph="a">A</phoneme>  station',
        {
          breakReplacement: ' ',
        }
      )
    ).toBe('bound for A station');
  });

  it('SSML を含まないテキストはそのまま返す', () => {
    expect(ssmlToPlainText('次は大崎です')).toBe('次は大崎です');
  });
});

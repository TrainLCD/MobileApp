import { detectTextLocale, resolveAgentLocale } from './agentLocale';

describe('detectTextLocale', () => {
  it.each([
    ['海が見える駅に行きたい', 'ja'],
    ['鎌倉', 'ja'],
    ['東京駅周辺', 'ja'],
    ['スカイツリーに行きたい', 'ja'],
    // 駅名をローマ字で書いても、助詞・活用のひらがながあれば日本語の文
    ['Kamakuraに行きたい', 'ja'],
    ['ｱｷﾊﾊﾞﾗ', 'ja'],
    ['I want to go to a station near the sea', 'en'],
    // 英文に日本語の固有名詞が混ざっても文自体は英語
    ['I want to go to 鎌倉', 'en'],
    ['I want to go to スカイツリー', 'en'],
    ['Which station is closest?', 'en'],
  ] as const)('%s は %s と判定する', (text, expected) => {
    expect(detectTextLocale(text)).toBe(expected);
  });

  it.each([
    // 駅名のローマ字 1 語だけでは、日本語話者・英語話者のどちらとも取れる
    ['Kamakura'],
    ['OK'],
    ['3'],
    [''],
    ['👍'],
  ])('%s は判定不能として null を返す', (text) => {
    expect(detectTextLocale(text)).toBeNull();
  });
});

describe('resolveAgentLocale', () => {
  it('最新のユーザ発話の言語を優先する', () => {
    expect(
      resolveAgentLocale(
        [
          { role: 'user', content: 'I want to see the ocean' },
          { role: 'assistant', content: 'How about Kamakura?' },
          { role: 'user', content: '他の候補はありますか' },
        ],
        'en'
      )
    ).toBe('ja');
  });

  it('最新の発話が判定不能なら直近の判定できるユーザ発話に合わせる', () => {
    expect(
      resolveAgentLocale(
        [
          { role: 'user', content: '海が見える駅に行きたい' },
          { role: 'assistant', content: '鎌倉はいかがでしょうか' },
          { role: 'user', content: 'OK' },
        ],
        'en'
      )
    ).toBe('ja');
  });

  it('アシスタントの発話は判定に使わない', () => {
    expect(
      resolveAgentLocale(
        [
          { role: 'assistant', content: '鎌倉はいかがでしょうか' },
          { role: 'user', content: 'Any other options?' },
        ],
        'ja'
      )
    ).toBe('en');
  });

  it('どのユーザ発話からも判定できなければ fallback を使う', () => {
    expect(
      resolveAgentLocale([{ role: 'user', content: 'Kamakura' }], 'ja')
    ).toBe('ja');
    expect(resolveAgentLocale([], 'en')).toBe('en');
  });
});

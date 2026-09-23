import { parseBoldSegments, splitUrls } from './AgentMessageBubble';

describe('parseBoldSegments', () => {
  it('強調を含まない文はそのまま 1 セグメントで返す', () => {
    expect(parseBoldSegments('こんにちは。')).toEqual([
      { text: 'こんにちは。', bold: false },
    ]);
  });

  it('**text** を太字セグメントに分解する', () => {
    expect(parseBoldSegments('おすすめは**鎌倉**です。')).toEqual([
      { text: 'おすすめは', bold: false },
      { text: '鎌倉', bold: true },
      { text: 'です。', bold: false },
    ]);
  });

  it('複数の強調を順に分解する', () => {
    expect(parseBoldSegments('**鎌倉**と**熱海**が候補です')).toEqual([
      { text: '鎌倉', bold: true },
      { text: 'と', bold: false },
      { text: '熱海', bold: true },
      { text: 'が候補です', bold: false },
    ]);
  });

  it('閉じられていない ** は文字どおり残す', () => {
    expect(parseBoldSegments('これは**未閉鎖です')).toEqual([
      { text: 'これは**未閉鎖です', bold: false },
    ]);
  });

  it('改行をまたぐ強調も解釈する', () => {
    expect(parseBoldSegments('**海の見える\n駅**です')).toEqual([
      { text: '海の見える\n駅', bold: true },
      { text: 'です', bold: false },
    ]);
  });

  it('空文字は空配列を返す', () => {
    expect(parseBoldSegments('')).toEqual([]);
  });
});

describe('splitUrls', () => {
  it('URL を含まない文はそのまま返す', () => {
    expect(splitUrls('こんにちは。')).toEqual([{ text: 'こんにちは。' }]);
  });

  it('全角括弧で囲まれた URL だけをリンクにする', () => {
    expect(
      splitUrls(
        'サービスステータス（https://status.trainlcd.app）もご確認ください。'
      )
    ).toEqual([
      { text: 'サービスステータス（' },
      {
        text: 'https://status.trainlcd.app',
        url: 'https://status.trainlcd.app',
      },
      { text: '）もご確認ください。' },
    ]);
  });

  it('空白なしで日本語が続いても URL に含めない', () => {
    expect(splitUrls('https://trainlcd.appをご覧ください')).toEqual([
      { text: 'https://trainlcd.app', url: 'https://trainlcd.app' },
      { text: 'をご覧ください' },
    ]);
  });

  it('文末のピリオドと半角の閉じ括弧を URL から外す', () => {
    expect(splitUrls('See (https://example.com/a?b=1).')).toEqual([
      { text: 'See (' },
      { text: 'https://example.com/a?b=1', url: 'https://example.com/a?b=1' },
      { text: ').' },
    ]);
  });

  it('URL 内で対応の取れた括弧は残す', () => {
    const url = 'https://en.wikipedia.org/wiki/Yamanote_Line_(disambiguation)';
    expect(splitUrls(`${url} を参照`)).toEqual([
      { text: url, url },
      { text: ' を参照' },
    ]);
  });

  it('カンマで直結した URL を別々のリンクに分ける', () => {
    expect(splitUrls('https://a.example,https://b.example')).toEqual([
      { text: 'https://a.example', url: 'https://a.example' },
      { text: ',' },
      { text: 'https://b.example', url: 'https://b.example' },
    ]);
  });

  it('URL の途中のカンマは残す', () => {
    const url = 'https://example.com/?ids=1,2';
    expect(splitUrls(url)).toEqual([{ text: url, url }]);
  });

  it('角括弧で囲まれた URL から閉じ角括弧を外す', () => {
    expect(splitUrls('[https://status.trainlcd.app]')).toEqual([
      { text: '[' },
      {
        text: 'https://status.trainlcd.app',
        url: 'https://status.trainlcd.app',
      },
      { text: ']' },
    ]);
  });

  it('IPv6 ホストの角括弧は残す', () => {
    const url = 'http://[::1]:8080/path';
    expect(splitUrls(`${url} を開く`)).toEqual([
      { text: url, url },
      { text: ' を開く' },
    ]);
  });

  it('複数の URL を順に分解する', () => {
    expect(splitUrls('http://a.example と https://b.example')).toEqual([
      { text: 'http://a.example', url: 'http://a.example' },
      { text: ' と ' },
      { text: 'https://b.example', url: 'https://b.example' },
    ]);
  });

  it('http(s) 以外のスキームはリンクにしない', () => {
    expect(splitUrls('javascript:alert(1) tel:0120')).toEqual([
      { text: 'javascript:alert(1) tel:0120' },
    ]);
  });

  it('スキームだけの文字列はリンクにしない', () => {
    expect(splitUrls('https://.')).toEqual([{ text: 'https://.' }]);
  });
});

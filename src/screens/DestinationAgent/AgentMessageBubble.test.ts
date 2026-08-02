import { parseBoldSegments } from './AgentMessageBubble';

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

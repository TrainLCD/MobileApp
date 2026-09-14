import { parseVitsManifest } from './manifest';

const validManifest = {
  schemaVersion: 1,
  version: '2026-09-15',
  model: 'vits-ljs.onnx',
  tokens: 'tokens.txt',
  lexicon: 'lexicon.txt',
  files: [
    {
      path: 'vits-ljs.onnx',
      url: 'https://assets.example.com/vits/vits-ljs.onnx',
      sha256: 'a'.repeat(64),
      bytes: 114_000_000,
    },
    {
      path: 'tokens.txt',
      url: 'https://assets.example.com/vits/tokens.txt',
      sha256: 'b'.repeat(64),
      bytes: 1_200,
    },
    {
      path: 'lexicon.txt',
      url: 'https://assets.example.com/vits/lexicon.txt',
      sha256: 'c'.repeat(64),
      bytes: 3_700_000,
    },
  ],
};

describe('parseVitsManifest', () => {
  it('正しいマニフェストを受理する', () => {
    expect(parseVitsManifest(validManifest)).toEqual(validManifest);
  });

  it('未知の schemaVersion は弾く', () => {
    expect(() =>
      parseVitsManifest({ ...validManifest, schemaVersion: 2 })
    ).toThrow();
  });

  it('ディレクトリの外へ出る相対パスは弾く', () => {
    for (const path of [
      '../vits-ljs.onnx',
      '/abs/vits-ljs.onnx',
      'a/../../x',
      'a//b.onnx',
      'a/./b.onnx',
    ]) {
      expect(() =>
        parseVitsManifest({
          ...validManifest,
          files: [{ ...validManifest.files[0], path }, ...validManifest.files],
        })
      ).toThrow(/unsafe relative path/);
    }
  });

  it('https 以外の URL は弾く', () => {
    expect(() =>
      parseVitsManifest({
        ...validManifest,
        files: [
          { ...validManifest.files[0], url: 'http://assets.example.com/x' },
          validManifest.files[1],
          validManifest.files[2],
        ],
      })
    ).toThrow();
  });

  it('files に無いモデル・辞書を指定していたら弾く', () => {
    for (const [key, value] of [
      ['model', 'other.onnx'],
      ['tokens', 'other-tokens.txt'],
      ['lexicon', 'other-lexicon.txt'],
    ] as const) {
      expect(() =>
        parseVitsManifest({ ...validManifest, [key]: value })
      ).toThrow(new RegExp(`${key}.*is not listed in files`));
    }
  });

  it('SHA-256 は 16 進 64 桁のみ受理する', () => {
    expect(() =>
      parseVitsManifest({
        ...validManifest,
        files: [
          { ...validManifest.files[0], sha256: 'A'.repeat(64) },
          validManifest.files[1],
          validManifest.files[2],
        ],
      })
    ).toThrow();
  });

  it('重複するパスは弾く', () => {
    expect(() =>
      parseVitsManifest({
        ...validManifest,
        files: [
          validManifest.files[0],
          validManifest.files[0],
          validManifest.files[1],
          validManifest.files[2],
        ],
      })
    ).toThrow(/duplicate/);
  });
});

import { parseVoicevoxManifest } from './manifest';

const validManifest = {
  schemaVersion: 1,
  version: '2026-09-08',
  openJtalkDicDir: 'open_jtalk_dic_utf_8-1.11',
  voiceModels: ['6.vvm'],
  files: [
    {
      path: 'open_jtalk_dic_utf_8-1.11/sys.dic',
      url: 'https://assets.example.com/voicevox/sys.dic',
      sha256: 'a'.repeat(64),
      bytes: 103_000_000,
    },
    {
      path: '6.vvm',
      url: 'https://assets.example.com/voicevox/6.vvm',
      sha256: 'b'.repeat(64),
      bytes: 55_000_000,
    },
  ],
};

describe('parseVoicevoxManifest', () => {
  it('正しいマニフェストを受理する', () => {
    expect(parseVoicevoxManifest(validManifest)).toEqual(validManifest);
  });

  it('未知の schemaVersion は弾く', () => {
    expect(() =>
      parseVoicevoxManifest({ ...validManifest, schemaVersion: 2 })
    ).toThrow();
  });

  it('ディレクトリの外へ出る相対パスは弾く', () => {
    for (const path of [
      '../sys.dic',
      '/abs/sys.dic',
      'dic/../../x',
      'dic//sys.dic',
      'dic/./sys.dic',
    ]) {
      expect(() =>
        parseVoicevoxManifest({
          ...validManifest,
          files: [{ ...validManifest.files[0], path }],
        })
      ).toThrow();
    }
  });

  it('https 以外の URL は弾く', () => {
    expect(() =>
      parseVoicevoxManifest({
        ...validManifest,
        files: [
          { ...validManifest.files[0], url: 'http://assets.example.com/x' },
          validManifest.files[1],
        ],
      })
    ).toThrow();
  });

  it('files に無い音声モデルを指定していたら弾く', () => {
    expect(() =>
      parseVoicevoxManifest({ ...validManifest, voiceModels: ['7.vvm'] })
    ).toThrow(/7\.vvm/);
  });

  it('辞書ディレクトリ配下のファイルが 1 つも無ければ弾く', () => {
    expect(() =>
      parseVoicevoxManifest({ ...validManifest, openJtalkDicDir: 'other' })
    ).toThrow(/openJtalkDicDir/);
  });

  it('SHA-256 は 16 進 64 桁のみ受理する', () => {
    expect(() =>
      parseVoicevoxManifest({
        ...validManifest,
        files: [
          { ...validManifest.files[0], sha256: 'A'.repeat(64) },
          validManifest.files[1],
        ],
      })
    ).toThrow();
  });

  it('重複するパスは弾く', () => {
    expect(() =>
      parseVoicevoxManifest({
        ...validManifest,
        files: [validManifest.files[0], validManifest.files[0]],
        voiceModels: ['open_jtalk_dic_utf_8-1.11/sys.dic'],
      })
    ).toThrow(/duplicate/);
  });
});

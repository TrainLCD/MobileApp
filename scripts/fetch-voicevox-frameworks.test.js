const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const scriptPath = path.resolve(__dirname, 'fetch-voicevox-frameworks.mjs');

const infoPlist = (identifier) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleExecutable</key>
\t<string>voicevox_onnxruntime</string>
\t<key>CFBundleIdentifier</key>
\t<string>${identifier}</string>
\t<key>CFBundleName</key>
\t<string>voicevox_onnxruntime</string>
\t<key>CFBundlePackageType</key>
\t<string>FMWK</string>
</dict>
</plist>
`;

// 展開済み扱いになる xcframework を組み立てる。取得を省略する経路
// (.trainlcd-version と xcframework 直下の Info.plist が揃っている) を通すことで
// ネットワークに触れずに正規化処理だけを検証できる
const setupFrameworksDir = ({ name, version, identifiers }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voicevox-frameworks-'));
  fs.writeFileSync(
    path.join(dir, 'voicevox-frameworks.json'),
    JSON.stringify({
      frameworks: [
        {
          name,
          version,
          url: 'https://example.invalid/never-downloaded.zip',
          sha256: '0'.repeat(64),
        },
      ],
    })
  );
  const xcframework = path.join(dir, `${name}.xcframework`);
  fs.mkdirSync(xcframework, { recursive: true });
  fs.writeFileSync(path.join(xcframework, '.trainlcd-version'), `${version}\n`);
  fs.writeFileSync(
    path.join(xcframework, 'Info.plist'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0"><dict><key>CFBundlePackageType</key><string>XFWK</string></dict></plist>\n'
  );
  const slicePlists = {};
  for (const [slice, identifier] of Object.entries(identifiers)) {
    const frameworkDir = path.join(xcframework, slice, `${name}.framework`);
    fs.mkdirSync(frameworkDir, { recursive: true });
    const plistPath = path.join(frameworkDir, 'Info.plist');
    fs.writeFileSync(plistPath, infoPlist(identifier));
    slicePlists[slice] = plistPath;
  }
  return { dir, xcframework, slicePlists };
};

const runScript = (frameworksDir) =>
  execFileSync(process.execPath, [scriptPath], {
    encoding: 'utf8',
    env: { ...process.env, VOICEVOX_FRAMEWORKS_DIR: frameworksDir },
  });

const readIdentifier = (plistPath) =>
  fs
    .readFileSync(plistPath, 'utf8')
    .match(/<key>CFBundleIdentifier<\/key>\s*<string>([^<]*)<\/string>/)[1];

describe('fetch-voicevox-frameworks', () => {
  const tempDirs = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('CFBundleIdentifier のアンダースコアを全スライスでハイフンに置き換える', () => {
    const { dir, slicePlists } = setupFrameworksDir({
      name: 'voicevox_onnxruntime',
      version: '1.23.2',
      identifiers: {
        'ios-arm64': 'jp.hiroshiba.voicevox.voicevox_onnxruntime',
        'ios-arm64_x86_64-simulator':
          'jp.hiroshiba.voicevox.voicevox_onnxruntime',
      },
    });
    tempDirs.push(dir);

    const stdout = runScript(dir);

    expect(stdout).toContain(
      'voicevox_onnxruntime 1.23.2 is already installed'
    );
    expect(stdout).toContain(
      'normalized CFBundleIdentifier jp.hiroshiba.voicevox.voicevox_onnxruntime -> jp.hiroshiba.voicevox.voicevox-onnxruntime'
    );
    for (const plistPath of Object.values(slicePlists)) {
      expect(readIdentifier(plistPath)).toBe(
        'jp.hiroshiba.voicevox.voicevox-onnxruntime'
      );
      // 識別子以外（実行ファイル名やバンドル名）は書き換えない
      expect(fs.readFileSync(plistPath, 'utf8')).toBe(
        infoPlist('jp.hiroshiba.voicevox.voicevox-onnxruntime')
      );
    }
  });

  it('既に有効な CFBundleIdentifier はそのままにし、再実行しても変化しない', () => {
    const { dir, slicePlists } = setupFrameworksDir({
      name: 'voicevox_core',
      version: '0.17.0',
      identifiers: {
        'ios-arm64': 'jp.hiroshiba.voicevox.voicevox-core',
      },
    });
    tempDirs.push(dir);
    const plistPath = slicePlists['ios-arm64'];
    const before = fs.statSync(plistPath).mtimeMs;

    const first = runScript(dir);
    const second = runScript(dir);

    expect(first).not.toContain('normalized CFBundleIdentifier');
    expect(second).not.toContain('normalized CFBundleIdentifier');
    expect(readIdentifier(plistPath)).toBe(
      'jp.hiroshiba.voicevox.voicevox-core'
    );
    expect(fs.statSync(plistPath).mtimeMs).toBe(before);
  });

  it('バイナリ plist は黙って素通しせずエラーにする', () => {
    const { dir, slicePlists } = setupFrameworksDir({
      name: 'voicevox_onnxruntime',
      version: '1.23.2',
      identifiers: { 'ios-arm64': 'placeholder' },
    });
    tempDirs.push(dir);
    fs.writeFileSync(slicePlists['ios-arm64'], 'bplist00');

    expect(() => runScript(dir)).toThrow(/is a binary plist/);
  });
});

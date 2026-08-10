const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const scriptSource = path.resolve(__dirname, 'bump-version.js');

const appConfigTemplate = (version, versionCode, iosBuildNumber) => `export default {
  name: 'TrainLCD',
  version: '${version}',
  ios: {
    bundleIdentifier: 'me.tinykitten.trainlcd',
    buildNumber: '${iosBuildNumber}',
  },
  android: {
    package: 'me.tinykitten.trainlcd',
    versionCode: ${versionCode},
  },
};
`;

const appBuildGradleTemplate = (versionCode, versionName) => `android {
    flavorDimensions += "environment"
    productFlavors {
        dev {
            dimension "environment"
            applicationId "me.tinykitten.trainlcd.dev"
            versionNameSuffix "-dev"
            versionCode ${versionCode}
            versionName "${versionName}"
        }
        prod {
            dimension "environment"
            versionCode ${versionCode}
            versionName "${versionName}"
        }
    }
}
`;

const wearableBuildGradleTemplate = (versionCode, versionName) => `android {
  productFlavors {
    create("dev") {
      dimension = "environment"
      applicationIdSuffix = ".dev"
      versionNameSuffix = "-dev"
      versionCode = ${versionCode}
      versionName = "${versionName}"
    }
    create("prod") {
      dimension = "environment"
      versionCode = ${versionCode}
      versionName = "${versionName}"
    }
  }
}
`;

const pbxprojTemplate = (projectVersion, marketingVersion) => `
    CURRENT_PROJECT_VERSION = ${projectVersion};
    MARKETING_VERSION = ${marketingVersion};
`;

const workspaces = [];

/**
 * bump-version.js はリポジトリルートを `__dirname/..` で解決する実行スクリプトなので、
 * import して単体で叩けない。スクリプトごと一時ディレクトリへ複製し、最小構成の
 * バージョン定義ファイルを置いた擬似リポジトリで実行して振る舞いを検証する。
 */
const createWorkspace = ({
  version = '10.12.1',
  appVersionCode = 100000586,
  wearableVersionCode = appVersionCode + 1,
  iosBuildNumber = 2824,
} = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-version-'));
  workspaces.push(root);

  fs.mkdirSync(path.join(root, 'scripts'));
  fs.mkdirSync(path.join(root, 'android', 'app'), { recursive: true });
  fs.mkdirSync(path.join(root, 'android', 'wearable'), { recursive: true });
  fs.mkdirSync(path.join(root, 'ios', 'TrainLCD.xcodeproj'), {
    recursive: true,
  });

  fs.copyFileSync(scriptSource, path.join(root, 'scripts', 'bump-version.js'));
  fs.writeFileSync(
    path.join(root, 'app.config.ts'),
    appConfigTemplate(version, appVersionCode, iosBuildNumber)
  );
  fs.writeFileSync(
    path.join(root, 'package.json'),
    `${JSON.stringify({ name: 'trainlcd', version }, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(root, 'android', 'app', 'build.gradle'),
    appBuildGradleTemplate(appVersionCode, version)
  );
  fs.writeFileSync(
    path.join(root, 'android', 'wearable', 'build.gradle.kts'),
    wearableBuildGradleTemplate(wearableVersionCode, version)
  );
  fs.writeFileSync(
    path.join(root, 'ios', 'TrainLCD.xcodeproj', 'project.pbxproj'),
    pbxprojTemplate(iosBuildNumber, version)
  );

  return root;
};

const runBump = (root, args = []) =>
  execFileSync(
    process.execPath,
    [path.join(root, 'scripts', 'bump-version.js'), ...args],
    { encoding: 'utf8' }
  );

const readAppVersionCode = (root) => {
  const content = fs.readFileSync(
    path.join(root, 'android', 'app', 'build.gradle'),
    'utf8'
  );
  return Number(/prod\s*\{[\s\S]*?versionCode\s+(\d+)/m.exec(content)[1]);
};

const readWearableVersionCode = (root) => {
  const content = fs.readFileSync(
    path.join(root, 'android', 'wearable', 'build.gradle.kts'),
    'utf8'
  );
  return Number(
    /create\("prod"\)\s*\{[\s\S]*?versionCode\b\s*=\s*(\d+)/m.exec(content)[1]
  );
};

afterEach(() => {
  while (workspaces.length > 0) {
    fs.rmSync(workspaces.pop(), { recursive: true, force: true });
  }
});

describe('bump-version.js の Android versionCode 採番', () => {
  it(':wearable を :app + 1 に追従させる', () => {
    const root = createWorkspace({ appVersionCode: 100000586 });

    runBump(root, ['--no-version-increment']);

    expect(readWearableVersionCode(root)).toBe(readAppVersionCode(root) + 1);
  });

  it('1リリースあたり2つ消費するため :app を2ずつ進める', () => {
    const root = createWorkspace({ appVersionCode: 100000586 });

    runBump(root, ['--no-version-increment']);

    expect(readAppVersionCode(root)).toBe(100000588);
    expect(readWearableVersionCode(root)).toBe(100000589);
  });

  // 回帰テスト: 増分が1だと前回の :wearable と今回の :app が同値になり、Play が
  // "Version code ... has already been used." を返してアップロードが落ちていた。
  it('連続してbumpしてもPlayで消費済みのversionCodeと衝突しない', () => {
    const root = createWorkspace({ appVersionCode: 100000586 });
    const consumed = [readAppVersionCode(root), readWearableVersionCode(root)];

    for (let i = 0; i < 5; i += 1) {
      runBump(root, ['--no-version-increment']);
      consumed.push(readAppVersionCode(root), readWearableVersionCode(root));
    }

    expect(new Set(consumed).size).toBe(consumed.length);
  });

  it('現在の :wearable 以下のversionCodeを明示指定したら失敗する', () => {
    const root = createWorkspace({
      appVersionCode: 100000586,
      wearableVersionCode: 100000587,
    });

    expect(() =>
      runBump(root, [
        '--no-version-increment',
        '--android-version',
        '100000587',
      ])
    ).toThrow();
    expect(readAppVersionCode(root)).toBe(100000586);
  });

  it('据え置き指定では :app < :wearable のままでも失敗しない', () => {
    const root = createWorkspace({
      appVersionCode: 100000586,
      wearableVersionCode: 100000587,
    });

    runBump(root, ['--no-version-increment', '--no-android-increment']);

    expect(readAppVersionCode(root)).toBe(100000586);
    expect(readWearableVersionCode(root)).toBe(100000587);
  });
});

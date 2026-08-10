#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const appConfigPath = path.join(rootDir, 'app.config.ts');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageLockJsonPath = path.join(rootDir, 'package-lock.json');
const pbxprojPath = path.join(rootDir, 'ios', 'TrainLCD.xcodeproj', 'project.pbxproj');
const androidBuildGradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');
const wearableBuildGradlePath = path.join(rootDir, 'android', 'wearable', 'build.gradle.kts');

const semverPattern = /^\d+\.\d+\.\d+$/;
const allowedIncrements = new Set(['major', 'minor', 'patch']);

// :wearable は :app と同じ applicationId を共有し、その versionCode は必ず
// 「:app + 1」に固定される（理由は updateWearableBuildGradle のコメントを参照）。
// つまり 1 リリースで versionCode を 2 つ消費するため、:app の増分を 1 にすると
// 前回の :wearable と今回の :app が同じ値になり、Play が
// "Version code ... has already been used." を返してアップロードが失敗する。
const ANDROID_VERSION_CODE_STEP = 2;

const args = process.argv.slice(2);
let explicitVersion = null;
let increment = null;
let explicitBuild = null;
let explicitIosBuild = null;
let explicitAndroidVersion = null;
let skipBuildIncrement = false;
let noIosIncrement = false;
let noAndroidIncrement = false;
let noVersionIncrement = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (allowedIncrements.has(arg)) {
    increment = arg;
    continue;
  }
  if (semverPattern.test(arg)) {
    explicitVersion = arg;
    continue;
  }
  if (arg === '--build') {
    explicitBuild = args[i + 1];
    if (!explicitBuild) {
      console.error('エラー: --build の後に数値を指定してください。');
      process.exit(1);
    }
    i += 1;
    continue;
  }
  if (arg === '--ios-build') {
    explicitIosBuild = args[i + 1];
    if (!explicitIosBuild) {
      console.error('エラー: --ios-build の後に数値を指定してください。');
      process.exit(1);
    }
    i += 1;
    continue;
  }
  if (arg === '--android-version') {
    explicitAndroidVersion = args[i + 1];
    if (!explicitAndroidVersion) {
      console.error('エラー: --android-version の後に数値を指定してください。');
      process.exit(1);
    }
    i += 1;
    continue;
  }
  if (arg === '--no-build-increment') {
    skipBuildIncrement = true;
    continue;
  }
  if (arg === '--no-ios-increment') {
    noIosIncrement = true;
    continue;
  }
  if (arg === '--no-android-increment') {
    noAndroidIncrement = true;
    continue;
  }
  if (arg === '--no-version-increment') {
    noVersionIncrement = true;
    continue;
  }
  console.error(`エラー: 未対応の引数 ${arg}`);
  process.exit(1);
}

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
};

const updateAppConfig = (filePath, version, versionCode, iosBuildNumber) => {
  let content = fs.readFileSync(filePath, 'utf8');

  if (version) {
    if (!/version:\s*['"][^'"]+['"]/.test(content)) {
      throw new Error('app.config.ts に version が見つかりません。');
    }
    content = content.replace(
      /version:\s*['"][^'"]+['"]/,
      `version: '${version}'`
    );
  }

  if (versionCode !== undefined) {
    if (!/versionCode:\s*\d+/.test(content)) {
      throw new Error('app.config.ts に versionCode が見つかりません。');
    }
    content = content.replace(
      /versionCode:\s*\d+/,
      `versionCode: ${versionCode}`
    );
  }

  if (iosBuildNumber !== undefined) {
    const buildNumberLine = `    buildNumber: '${iosBuildNumber}',`;
    const lines = content.split('\n');
    let iosStartIndex = -1;
    let iosEndIndex = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (/^  ios:\s*\{/.test(lines[i])) {
        iosStartIndex = i;
        break;
      }
    }
    if (iosStartIndex === -1) {
      throw new Error('app.config.ts に ios セクションが見つかりません。');
    }
    for (let i = iosStartIndex + 1; i < lines.length; i += 1) {
      if (lines[i].startsWith('  },')) {
        iosEndIndex = i;
        break;
      }
    }
    if (iosEndIndex === -1) {
      throw new Error('app.config.ts の ios セクション終端が見つかりません。');
    }
    let replaced = false;
    for (let i = iosStartIndex + 1; i < iosEndIndex; i += 1) {
      if (lines[i].trim().startsWith('buildNumber:')) {
        lines[i] = buildNumberLine;
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      lines.splice(iosStartIndex + 1, 0, buildNumberLine);
    }
    content = lines.join('\n');
  }

  fs.writeFileSync(filePath, content);
};

const updatePbxproj = (filePath, projectVersion, marketingVersion) => {
  const content = fs.readFileSync(filePath, 'utf8');

  if (!/CURRENT_PROJECT_VERSION = \d+;/.test(content)) {
    throw new Error('project.pbxproj に CURRENT_PROJECT_VERSION が見つかりません。');
  }

  let updatedContent = content.replace(
    /CURRENT_PROJECT_VERSION = \d+;/g,
    `CURRENT_PROJECT_VERSION = ${projectVersion};`,
  );

  if (marketingVersion) {
    if (!/MARKETING_VERSION = [^;]+;/.test(content)) {
      throw new Error('project.pbxproj に MARKETING_VERSION が見つかりません。');
    }
    updatedContent = updatedContent.replace(
      /MARKETING_VERSION = [^;]+;/g,
      `MARKETING_VERSION = ${marketingVersion};`,
    );
  }

  fs.writeFileSync(filePath, updatedContent);
};

const replaceFlavorNumericSetting = (source, flavor, key, value) => {
  const regex = new RegExp(`(${flavor}\\s*\\{[\\s\\S]*?${key}\\s+)(\\d+)`, 'm');
  if (!regex.test(source)) {
    throw new Error(`build.gradle の ${flavor} フレーバーに ${key} が見つかりません。`);
  }
  return source.replace(regex, `$1${value}`);
};

const replaceFlavorStringSetting = (source, flavor, key, value) => {
  const regex = new RegExp(`(${flavor}\\s*\\{[\\s\\S]*?${key}\\s+)"([^"]*)"`, 'm');
  if (!regex.test(source)) {
    throw new Error(`build.gradle の ${flavor} フレーバーに ${key} が見つかりません。`);
  }
  return source.replace(regex, `$1"${value}"`);
};

const updateAndroidBuildGradle = (filePath, versionCode, versionName) => {
  let content = fs.readFileSync(filePath, 'utf8');

  // productFlavors内のdev/prodのversionCodeを更新
  content = replaceFlavorNumericSetting(content, 'dev', 'versionCode', versionCode);
  content = replaceFlavorNumericSetting(content, 'prod', 'versionCode', versionCode);

  // versionNameを更新（versionNameが指定された場合のみ）
  if (versionName) {
    content = replaceFlavorStringSetting(content, 'dev', 'versionName', versionName);
    content = replaceFlavorStringSetting(content, 'prod', 'versionName', versionName);
  }

  fs.writeFileSync(filePath, content);
};

// :wearable は Kotlin DSL のため Groovy 側 (`versionCode 1`) と構文が異なり
// (`create("prod") { versionCode = 1 }`)、専用の置換関数が必要になる。
// `versionName\b` の \b は versionNameSuffix への誤マッチを防ぐ。
const replaceKtsFlavorNumericSetting = (source, flavor, key, value) => {
  const regex = new RegExp(`(create\\("${flavor}"\\)\\s*\\{[\\s\\S]*?${key}\\b\\s*=\\s*)(\\d+)`, 'm');
  if (!regex.test(source)) {
    throw new Error(`build.gradle.kts の ${flavor} フレーバーに ${key} が見つかりません。`);
  }
  return source.replace(regex, `$1${value}`);
};

const replaceKtsFlavorStringSetting = (source, flavor, key, value) => {
  const regex = new RegExp(`(create\\("${flavor}"\\)\\s*\\{[\\s\\S]*?${key}\\b\\s*=\\s*)"([^"]*)"`, 'm');
  if (!regex.test(source)) {
    throw new Error(`build.gradle.kts の ${flavor} フレーバーに ${key} が見つかりません。`);
  }
  return source.replace(regex, `$1"${value}"`);
};

// :wearable は :app と applicationId が同一のマルチバンドル配信のため、Play は minSdk が
// 高い側 (:wearable) の versionCode が高いことを要求する。逆転・同値になるとリリースを
// 公開できないため、:app の versionCode + 1 に必ず追従させる。
// 追従を忘れると :app だけが進んで逆転する事故が起きるので、ここで機械的に更新する。
const updateWearableBuildGradle = (filePath, versionCode, versionName) => {
  let content = fs.readFileSync(filePath, 'utf8');

  content = replaceKtsFlavorNumericSetting(content, 'dev', 'versionCode', versionCode);
  content = replaceKtsFlavorNumericSetting(content, 'prod', 'versionCode', versionCode);

  if (versionName) {
    content = replaceKtsFlavorStringSetting(content, 'dev', 'versionName', versionName);
    content = replaceKtsFlavorStringSetting(content, 'prod', 'versionName', versionName);
  }

  fs.writeFileSync(filePath, content);
};

const extractVersionFromAppConfig = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/version:\s*['"]([^'"]+)['"]/);
  if (!match) {
    throw new Error('app.config.ts から version を取得できません。');
  }
  return match[1];
};

const extractVersionCodeFromBuildGradle = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  // prodフレーバーからversionCodeを取得
  const match = content.match(/prod\s*\{[\s\S]*?versionCode\s+(\d+)/m);
  if (!match) {
    throw new Error('build.gradle の prod フレーバーから versionCode を取得できません。');
  }
  return Number(match[1]);
};

const extractVersionCodeFromWearableBuildGradle = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/create\("prod"\)\s*\{[\s\S]*?versionCode\b\s*=\s*(\d+)/m);
  if (!match) {
    throw new Error('build.gradle.kts の prod フレーバーから versionCode を取得できません。');
  }
  return Number(match[1]);
};

const extractIosBuildNumberFromPbxproj = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/CURRENT_PROJECT_VERSION = (\d+);/);
  if (!match) {
    throw new Error('project.pbxproj から CURRENT_PROJECT_VERSION を取得できません。');
  }
  return Number(match[1]);
};

const toNumberOrZero = (value) => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }
  const result = Number(value);
  if (Number.isNaN(result)) {
    throw new Error(`数値へ変換できませんでした: ${value}`);
  }
  return result;
};

const bumpSemver = (currentVersion, type) => {
  if (!semverPattern.test(currentVersion)) {
    throw new Error(`SemVer形式ではないためバージョンを更新できません: ${currentVersion}`);
  }
  const [major, minor, patch] = currentVersion.split('.').map((value) => Number(value));
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
};

const packageJson = readJson(packageJsonPath);

const currentVersion = extractVersionFromAppConfig(appConfigPath);
const currentAndroidVersionCode = extractVersionCodeFromBuildGradle(androidBuildGradlePath);
const currentWearableVersionCode = extractVersionCodeFromWearableBuildGradle(wearableBuildGradlePath);
const currentIosBuildNumber = extractIosBuildNumberFromPbxproj(pbxprojPath);

let nextVersion = explicitVersion;
if (!nextVersion) {
  if (noVersionIncrement) {
    nextVersion = currentVersion;
  } else {
    nextVersion = bumpSemver(currentVersion, increment ?? 'patch');
  }
}

if (!semverPattern.test(nextVersion)) {
  console.error(`エラー: 指定したバージョンがSemVer形式ではありません: ${nextVersion}`);
  process.exit(1);
}

if (skipBuildIncrement) {
  noIosIncrement = true;
  noAndroidIncrement = true;
}

const parseExplicitNumber = (value, label) => {
  const result = Number(value);
  if (Number.isNaN(result)) {
    console.error(`エラー: ${label} は数値である必要があります: ${value}`);
    process.exit(1);
  }
  return result;
};

const resolvedExplicitBuild = explicitBuild !== null ? parseExplicitNumber(explicitBuild, '--build') : null;
if (resolvedExplicitBuild !== null) {
  if (explicitIosBuild === null) {
    explicitIosBuild = resolvedExplicitBuild;
  }
  if (explicitAndroidVersion === null) {
    explicitAndroidVersion = resolvedExplicitBuild;
  }
}

const resolvedIosExplicit = explicitIosBuild !== null ? parseExplicitNumber(explicitIosBuild, '--ios-build') : null;
const resolvedAndroidExplicit = explicitAndroidVersion !== null ? parseExplicitNumber(explicitAndroidVersion, '--android-version') : null;

const shouldIncrementIos = resolvedIosExplicit === null && !noIosIncrement;
const shouldIncrementAndroid = resolvedAndroidExplicit === null && !noAndroidIncrement;

let nextIosBuildNumber = resolvedIosExplicit !== null ? resolvedIosExplicit : (shouldIncrementIos ? currentIosBuildNumber + 1 : currentIosBuildNumber);
if (nextIosBuildNumber <= 0) {
  console.error('エラー: iOSのビルド番号は1以上である必要があります。');
  process.exit(1);
}
if (!Number.isInteger(nextIosBuildNumber)) {
  console.error('エラー: iOSのビルド番号は整数である必要があります。');
  process.exit(1);
}

let nextAndroidVersionCode;
if (resolvedAndroidExplicit !== null) {
  nextAndroidVersionCode = resolvedAndroidExplicit;
} else if (shouldIncrementAndroid) {
  nextAndroidVersionCode = currentAndroidVersionCode + ANDROID_VERSION_CODE_STEP;
} else {
  nextAndroidVersionCode = currentAndroidVersionCode;
}

if (!Number.isInteger(nextAndroidVersionCode)) {
  console.error('エラー: AndroidのversionCodeは整数である必要があります。');
  process.exit(1);
}

// versionCode を進める意図があるときだけ検査する。据え置き（--no-android-increment）では
// :app < :wearable が正常な状態なので、この検査を通すと必ず落ちてしまう。
const androidVersionCodeShouldAdvance =
  resolvedAndroidExplicit !== null || shouldIncrementAndroid;
if (
  androidVersionCodeShouldAdvance &&
  nextAndroidVersionCode <= currentWearableVersionCode
) {
  console.error(
    `エラー: AndroidのversionCode ${nextAndroidVersionCode} は現在のWear OS versionCode ${currentWearableVersionCode} 以下です。` +
      'Playでは両モジュールがversionCodeの名前空間を共有するため、既に消費済みの番号と衝突します。' +
      `--android-version には ${currentWearableVersionCode + 1} 以上を指定してください。`
  );
  process.exit(1);
}

// 各ファイルを更新
const versionChanged = currentVersion !== nextVersion;
const androidVersionCodeChanged = currentAndroidVersionCode !== nextAndroidVersionCode;
const iosBuildNumberChanged = currentIosBuildNumber !== nextIosBuildNumber;

if (versionChanged || androidVersionCodeChanged || iosBuildNumberChanged) {
  updateAppConfig(
    appConfigPath,
    versionChanged ? nextVersion : null,
    androidVersionCodeChanged ? Math.trunc(nextAndroidVersionCode) : undefined,
    iosBuildNumberChanged ? String(nextIosBuildNumber) : undefined
  );
}

if (versionChanged) {
  packageJson.version = nextVersion;
  writeJson(packageJsonPath, packageJson);

  if (fs.existsSync(packageLockJsonPath)) {
    const packageLockJson = readJson(packageLockJsonPath);
    packageLockJson.version = nextVersion;
    if (packageLockJson.packages?.['']) {
      packageLockJson.packages[''].version = nextVersion;
    }
    writeJson(packageLockJsonPath, packageLockJson);
  }
}

// MARKETING_VERSIONはバージョンが変更された場合のみ更新
updatePbxproj(pbxprojPath, nextIosBuildNumber, versionChanged ? nextVersion : null);
updateAndroidBuildGradle(androidBuildGradlePath, Math.trunc(nextAndroidVersionCode), versionChanged ? nextVersion : null);

// :wearable は常に :app + 1 に揃える（現在値が同値・逆転していても矯正される）
const nextWearableVersionCode = Math.trunc(nextAndroidVersionCode) + 1;
updateWearableBuildGradle(wearableBuildGradlePath, nextWearableVersionCode, versionChanged ? nextVersion : null);

if (versionChanged) {
  console.log(`バージョンを ${currentVersion} → ${nextVersion} に更新しました。`);
} else {
  console.log(`バージョン ${currentVersion} は変更しません。`);
}
console.log(`iOS ビルド番号: ${currentIosBuildNumber} → ${nextIosBuildNumber}`);
console.log(`Android versionCode: ${currentAndroidVersionCode} → ${Math.trunc(nextAndroidVersionCode)}`);
console.log(`Wear OS versionCode: ${currentWearableVersionCode} → ${nextWearableVersionCode}`);

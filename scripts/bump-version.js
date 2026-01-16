#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const appJsonPath = path.join(rootDir, 'app.json');
const packageJsonPath = path.join(rootDir, 'package.json');
const pbxprojPath = path.join(rootDir, 'ios', 'TrainLCD.xcodeproj', 'project.pbxproj');
const androidBuildGradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');

const semverPattern = /^\d+\.\d+\.\d+$/;
const allowedIncrements = new Set(['major', 'minor', 'patch']);

const args = process.argv.slice(2);
let explicitVersion = null;
let increment = null;
let explicitBuild = null;
let explicitIosBuild = null;
let explicitAndroidVersion = null;
let skipBuildIncrement = false;
let noIosIncrement = false;
let noAndroidIncrement = false;

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
  console.error(`エラー: 未対応の引数 ${arg}`);
  process.exit(1);
}

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
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

const extractFlavorSetting = (source, flavor, key, valuePattern) => {
  const regex = new RegExp(`${flavor}\\s*\\{[\\s\\S]*?${key}\\s*${valuePattern}`, 'm');
  const match = source.match(regex);
  if (!match) {
    throw new Error(`build.gradle の ${flavor} フレーバーに ${key} が見つかりません。`);
  }
  return match;
};

const replaceFlavorNumericSetting = (source, flavor, key, value) => {
  const regex = new RegExp(`(${flavor}\\s*\\{[\\s\\S]*?${key}\\s*)(\\d+)`, 'm');
  if (!regex.test(source)) {
    throw new Error(`build.gradle の ${flavor} フレーバーに ${key} が見つかりません。`);
  }
  return source.replace(regex, `$1${value}`);
};

const replaceFlavorStringSetting = (source, flavor, key, value) => {
  const regex = new RegExp(`(${flavor}\\s*\\{[\\s\\S]*?${key}\\s*)"([^"]*)"`, 'm');
  if (!regex.test(source)) {
    throw new Error(`build.gradle の ${flavor} フレーバーに ${key} が見つかりません。`);
  }
  return source.replace(regex, `$1"${value}"`);
};

const updateAndroidBuildGradle = (filePath, versionCode, versionName) => {
  const content = fs.readFileSync(filePath, 'utf8');

  extractFlavorSetting(content, 'dev', 'versionCode', '(\\d+)');
  const prodVersionCodeMatch = extractFlavorSetting(content, 'prod', 'versionCode', '(\\d+)');

  const currentProdVersionCode = Number(prodVersionCodeMatch[1]);
  if (Number.isNaN(currentProdVersionCode)) {
    throw new Error('prod フレーバーの versionCode が数値として認識できません。');
  }

  const nextProdVersionCode = Math.max(currentProdVersionCode, versionCode);

  let updatedContent = content;
  updatedContent = replaceFlavorNumericSetting(updatedContent, 'dev', 'versionCode', versionCode);
  updatedContent = replaceFlavorNumericSetting(updatedContent, 'prod', 'versionCode', nextProdVersionCode);
  updatedContent = replaceFlavorStringSetting(updatedContent, 'dev', 'versionName', versionName);
  updatedContent = replaceFlavorStringSetting(updatedContent, 'prod', 'versionName', versionName);

  fs.writeFileSync(filePath, updatedContent);
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

const resolveAndroidMinVersionCode = (appJson) => {
  const minValue = appJson?.expo?.extra?.versioning?.androidMinVersionCode;
  if (minValue === undefined || minValue === null) {
    return null;
  }
  if (typeof minValue !== 'number') {
    throw new Error('extra.versioning.androidMinVersionCode は数値で指定してください。');
  }
  return minValue;
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

const appJson = readJson(appJsonPath);
const packageJson = readJson(packageJsonPath);

const currentVersion = appJson.expo?.version;
if (!currentVersion) {
  console.error('エラー: app.json に expo.version が見つかりません。');
  process.exit(1);
}

let nextVersion = explicitVersion;
if (!nextVersion) {
  nextVersion = bumpSemver(currentVersion, increment ?? 'patch');
}

if (!semverPattern.test(nextVersion)) {
  console.error(`エラー: 指定したバージョンがSemVer形式ではありません: ${nextVersion}`);
  process.exit(1);
}

const iosBuildNumber = toNumberOrZero(appJson.expo?.ios?.buildNumber);
const androidVersionCode = toNumberOrZero(appJson.expo?.android?.versionCode);
const androidMinVersionCode = resolveAndroidMinVersionCode(appJson) ?? androidVersionCode;

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

let nextIosBuildNumber = resolvedIosExplicit !== null ? resolvedIosExplicit : (shouldIncrementIos ? iosBuildNumber + 1 : iosBuildNumber);
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
  const base = Math.max(androidVersionCode, androidMinVersionCode);
  nextAndroidVersionCode = base + 1;
} else {
  nextAndroidVersionCode = Math.max(androidVersionCode, androidMinVersionCode);
}

if (nextAndroidVersionCode < androidMinVersionCode) {
  console.error(`エラー: AndroidのversionCodeは ${androidMinVersionCode} 以上に設定してください。指定値: ${nextAndroidVersionCode}`);
  process.exit(1);
}
if (!Number.isInteger(nextAndroidVersionCode)) {
  console.error('エラー: AndroidのversionCodeは整数である必要があります。');
  process.exit(1);
}

// expo-versionプラグインが参照する値を更新
appJson.expo.version = nextVersion;
if (!appJson.expo.ios) {
  appJson.expo.ios = {};
}
if (!appJson.expo.android) {
  appJson.expo.android = {};
}
appJson.expo.ios.buildNumber = String(nextIosBuildNumber);
appJson.expo.android.versionCode = Math.trunc(nextAndroidVersionCode);

if (!appJson.expo.extra) {
  appJson.expo.extra = {};
}
if (!appJson.expo.extra.versioning || typeof appJson.expo.extra.versioning !== 'object') {
  appJson.expo.extra.versioning = {};
}
appJson.expo.extra.versioning.androidMinVersionCode = Math.trunc(nextAndroidVersionCode);

// Nodeパッケージとしてのバージョンも同期
packageJson.version = nextVersion;

writeJson(appJsonPath, appJson);
writeJson(packageJsonPath, packageJson);
updatePbxproj(pbxprojPath, nextIosBuildNumber, nextVersion);
updateAndroidBuildGradle(androidBuildGradlePath, Math.trunc(nextAndroidVersionCode), nextVersion);

console.log(`バージョンを ${currentVersion} → ${nextVersion} に更新しました。`);
console.log(`iOS ビルド番号: ${iosBuildNumber || '(未設定)'} → ${nextIosBuildNumber}`);
console.log(`Android versionCode: ${androidVersionCode || '(未設定)'} → ${Math.trunc(nextAndroidVersionCode)}`);

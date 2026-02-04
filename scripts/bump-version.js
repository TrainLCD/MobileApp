#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const appConfigPath = path.join(rootDir, 'app.config.ts');
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
      if (lines[i].includes('ios: {')) {
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
    content = `${lines.join('\n')}\n`;
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
  nextAndroidVersionCode = currentAndroidVersionCode + 1;
} else {
  nextAndroidVersionCode = currentAndroidVersionCode;
}

if (!Number.isInteger(nextAndroidVersionCode)) {
  console.error('エラー: AndroidのversionCodeは整数である必要があります。');
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
}

// MARKETING_VERSIONはバージョンが変更された場合のみ更新
updatePbxproj(pbxprojPath, nextIosBuildNumber, versionChanged ? nextVersion : null);
updateAndroidBuildGradle(androidBuildGradlePath, Math.trunc(nextAndroidVersionCode), versionChanged ? nextVersion : null);

if (versionChanged) {
  console.log(`バージョンを ${currentVersion} → ${nextVersion} に更新しました。`);
} else {
  console.log(`バージョン ${currentVersion} は変更しません。`);
}
console.log(`iOS ビルド番号: ${currentIosBuildNumber} → ${nextIosBuildNumber}`);
console.log(`Android versionCode: ${currentAndroidVersionCode} → ${Math.trunc(nextAndroidVersionCode)}`);

# オンデバイス TTS (VOICEVOX) 設計書 — iOS

iOS でリモート TTS（[リモート TTS 設計書](./remote-tts.md)）が使えない回の**日本語**を、
Apple 内蔵 TTS のコンパクト音声ではなく [VOICEVOX CORE](https://github.com/VOICEVOX/voicevox_core)
で端末内合成して読み上げる。英語は VOICEVOX が話せないため、従来どおり端末内蔵 TTS
（`expo-speech`）で読む。

背景: Apple 内蔵 TTS の日本語は既定でコンパクト版が選ばれ、Enhanced / Premium 音声は
ユーザーが設定アプリから手動でダウンロードしない限り使えない（アプリからダウンロードを
起動する API は無い）。リモート TTS が主経路の iOS では、圏外・トンネル・API 障害のときだけ
この機械的な声が突然流れることになり、体験を大きく損なっていた。

## 読み上げ経路

```text
useTTS
  ├─ useRemoteSpeechEngine   Worker /tts (Google Cloud TTS) → expo-audio          … 主経路
  ├─ useVoicevoxSpeechEngine 日本語: VOICEVOX CORE → WAV → expo-audio             … リモート不可時
  │                          英語  : useNativeSpeechEngine へ委譲
  └─ useNativeSpeechEngine   端末内蔵 TTS (expo-speech) で日英とも                 … 最終フォールバック
```

`useVoicevoxSpeechEngine` は次のいずれかを満たさないと `onUnavailable` を返し、その回は
端末内蔵 TTS が日英とも読む。

- ネイティブモジュール `VoicevoxTTSModule` がある（iOS 本体アプリのみ。App Clip / Android には無い）
- Remote Config `voicevox_tts_enabled_ios` が `true`
- 辞書と音声モデルの取得・検証が完了している（[資産の取得](#資産の取得)）
- Remote Config のスタイル ID が読み込んだ音声モデルに含まれている

日本語の再生が始まった後の失敗（英語側の失敗を含む）は `onSettled` で終える。途中まで
読んだ放送を頭から読み直さない、という `SpeechEngine` の契約はリモート TTS と同じ。

合成器の初期化（VVM の展開）は初回の発話まで遅らせる。リモート TTS が使える通常時は
VOICEVOX を一切メモリへ載せないためで、代わりに初回フォールバック時は合成器の構築分だけ
発話が遅れる。ネイティブ側はメモリ警告を受けると合成器を解放し、次の合成時に同じ設定で
作り直す。

### テキスト

日本語文は端末内蔵 TTS と同じ `toSpeakableText(ssml, 'JA', 'native')` を通す。
`<sub alias="ヨミ">` の読み（カタカナ）が渡り、`<break/>` は「、」になる。VOICEVOX の
Open JTalk がカタカナから読みとアクセントを推定するため、**読みは固定されるがアクセントは
推定任せ**である点は Apple / Google と変わらない。`create_audio_query_from_kana`
（AquesTalk 風記法）はアクセント核の指定が必須で、アプリにも StationAPI にもアクセント情報が
無いため使っていない。

### 速度

アナウンス速度設定（`ttsSpeedPreferenceAtom`）を `VOICEVOX_SPEED_SCALES` で
`AudioQuery.speedScale` へ写像する。倍率はリモート TTS の `REMOTE_TTS_SPEED_RATES` と同じ。
ネイティブ側は `voicevox_synthesizer_tts` ではなく `create_audio_query` → `speedScale`
書き換え → `synthesis` の 2 段で合成する。

## ネイティブモジュール

`ios/Modules/VoicevoxTTS/`（Swift + ObjC ブリッジ）。既存の `LiveActivity` などと同じく
pod ではなく Xcode の本体ターゲットへ直接追加してある。

| メソッド | 役割 |
| --- | --- |
| `setup({ openJtalkDicDir, voiceModelPaths, cpuNumThreads })` | ONNX Runtime 初期化・辞書読込・合成器生成・VVM 読込。同じ設定なら no-op。読み込んだスタイル ID を返す |
| `synthesize({ text, styleId, speedScale, outputPath })` | WAV（24kHz / 16bit / mono）を `outputPath` へ書く |
| `release()` | 合成器と辞書を解放する |
| `sha256(path)` | ダウンロード検証用。100MB 超の辞書を JS へ読み込まずにハッシュする |
| `setExcludedFromBackup(path)` | 取得した資産を iCloud バックアップから除外する |

VOICEVOX CORE の C API はスレッドセーフを保証していないため、全操作を 1 本の直列キューで
実行する。iOS 向けリリース物は ONNX Runtime をロード時に動的リンクする
（`VOICEVOX_LINK_ONNXRUNTIME`）ため、`voicevox_onnxruntime.framework` も埋め込む。

### フレームワークの取得

`ios/Frameworks/voicevox-frameworks.json` に固定したバージョン・URL・SHA-256 のとおり、
`scripts/fetch-voicevox-frameworks.mjs` が GitHub Releases から zip を取得・検証して
`ios/Frameworks/*.xcframework` へ展開する（展開物は `.gitignore` 済み）。

- ローカル: `npm run ios` の前段で自動実行される（`npm run ios:frameworks` 単体でも可）
- CI: `.github/workflows/build_ios_*.yml` の `pod install` 前

| フレームワーク | バージョン | 展開後 (arm64) | 最低 iOS |
| --- | --- | --- | --- |
| `voicevox_core.xcframework` | 0.17.0 | 約 2.6MB | 16.2 |
| `voicevox_onnxruntime.xcframework` | 1.23.2 | 約 15.3MB | 16.0 |

いずれも正規の `.framework` バンドル形式で、App Store 提出時に `.dylib` が弾かれる
（voicevox_core Issue #715）問題は現行の配布物では起きない。バージョンを上げるときは JSON の
`url` と `sha256` を両方更新すること。

`voicevox_onnxruntime` 1.23.2 の配布物はそのまま埋め込むと App Store 向けの検証に 2 段階で
弾かれるため、取得スクリプトが展開後に次の 2 つを補正する。取得を省略した場合も毎回走る冪等な
処理なので、展開済みのローカル環境でも `npm run ios:frameworks` を一度実行すれば反映される。

1. **`CFBundleIdentifier` の正規化**: iOS スライスの識別子が
   `jp.hiroshiba.voicevox.voicevox_onnxruntime` とアンダースコアを含んでおり、Apple の規則
   （英数字・ハイフン・ピリオドのみ）に反するため Xcode の archive 時検証で
   `had an invalid CFBundleIdentifier in its Info.plist` として失敗する。各スライスの
   `Info.plist` を走査してアンダースコアをハイフンへ置き換える（`voicevox_core` は元から
   `voicevox-core` なので対象外）。
1. **ad-hoc での署名し直し**: `voicevox_onnxruntime` のバイナリには識別子
   `libvoicevox_onnxruntime.1` の ad-hoc 署名が埋め込まれている。Xcode は埋め込み時に
   `--preserve-metadata=identifier` で既存の識別子を引き継ぐため、App Store Connect への
   アップロードが `Invalid Code Signature Identifier ... must match its Bundle Identifier` で
   失敗する。`codesign --force --sign - --identifier <CFBundleIdentifier>` で各スライスの
   framework を署名し直し、識別子をバンドル識別子に揃える（未署名の `voicevox_core` は Xcode が
   `CFBundleIdentifier` から識別子を導出するので元々問題無いが、配布物の署名状態に依存しないよう
   一律に署名し直す）。`codesign` は macOS にしか無いので、それ以外の環境では省略する。

### App Clip には含めない

App Clip（`ProdAppClip` / `CanaryAppClip`）は deployment target が 16.4 のため非圧縮
バイナリの上限が 15MB で、上記 2 フレームワーク（約 18MB）を埋め込めない。そのため
モジュールのソースもフレームワークも本体ターゲットにだけ追加し、App Clip は従来どおり
「リモート TTS → 端末内蔵 TTS」の経路のままにする。JS 側は `NativeModules.VoicevoxTTSModule`
の有無で判定するので、Clip 向けの分岐は要らない。

## 資産の取得

辞書（Open JTalk）と音声モデル（VVM）はアプリに同梱せず、初回にダウンロードする。
処理は `src/lib/voicevox/assets.ts`。

- 置き場は `Paths.document/voicevox/<version>/`。`cache` はストレージ逼迫時に OS が消しうる
  ため使わない。iCloud バックアップからはネイティブ側で除外する。
- マニフェストの `version` が変わったら新しいディレクトリへ取り直し、完了後に旧バージョンを
  削除する。
- 各ファイルはサイズと SHA-256 で検証する。検証済みの状態は MMKV（`VOICEVOX_ASSETS`）に記録し、
  次回起動以降はファイルの存在とサイズだけを確認して再ハッシュしない。
- 取得は同時に 1 本だけ走らせ、失敗後は `VOICEVOX_ASSET_RETRY_INTERVAL_MS` の間再試行しない。
- 約 160MB の通信になるため、**ユーザーの同意なしには取得しない**（[同意と進捗表示](#同意と進捗表示)）。
  同意後は `useVoicevoxSpeechEngine` のマウント（= TTS が有効）と Remote Config の更新を
  トリガーに、中断した取得や更新版の取得を自動で再開する。発話時点で未取得なら、その回は
  端末内蔵 TTS で読み、取得は裏で続ける。

### 同意と進捗表示

設定画面（`src/screens/TTSSettings.tsx`）が担う。

- **同意ダイアログ**: 自動アナウンスを有効化した瞬間に、VOICEVOX が使える構成
  （`phase !== 'unsupported'`）で未取得なら「オフライン用の日本語音声」の同意ダイアログを
  出す。文言は「ダウンロードしなくても通信できないときは端末内蔵の読み上げ音声で流れる」
  「ダウンロードすると圏外・トンネルでもより自然な音声（VOICEVOX:No.7）で読める」の
  2 点を明示し、取得が再生の前提だと読めないようにする（パネルの未取得時の説明・削除確認も
  同じ趣旨）。既存の注意ダイアログが先に出る場合はキューで続けて表示される。
  「ダウンロード」で `requestVoicevoxAssetsDownload()`（同意を MMKV
  `VOICEVOX_DOWNLOAD_CONSENTED` に記録して直ちに取得）、「あとで」なら何もしない。
  自動アナウンス自体はどちらでも有効になる。
- **パネル**: 設定画面の速度設定の下に「オフライン用の日本語音声」の枠を出し、状態ごとに
  操作を変える。状態は `useVoicevoxAssetsStatus()`（`getVoicevoxAssetsStatus()` の
  `useSyncExternalStore` 版）で購読する。

  | phase | 表示 | 操作 |
  | --- | --- | --- |
  | `not_downloaded` | 説明と概算サイズ | ダウンロード |
  | `downloading` | 進捗バーと `%`・取得済み / 合計 MB | キャンセル（同意も取り消す。取得済みファイルは残り、次回は続きから） |
  | `installed` | 取得済みサイズ | 削除（確認ダイアログ → 合成器を解放してディレクトリごと削除・同意も取り消す） |
  | `error` | 失敗の案内 | 再試行（失敗後の待機時間を無視して取得） |
  | `unsupported` | 出さない | — |

  進捗は `File.downloadFileAsync` の `onProgress` をファイル横断で合算し、検証済みで
  飛ばしたファイル分も取得済みに含める。通知は全体の 0.5% ごとに間引き、設定画面の
  再描画を抑える。

### マニフェスト

Remote Config `voicevox_tts_manifest_url_ios` が指す JSON。形式は
`src/lib/voicevox/manifest.ts`（zod スキーマ）が正。`scripts/build-voicevox-manifest.mjs` で
生成する。

```bash
set -euo pipefail   # 取得・展開・生成のどこかで失敗したら、そこで止める

# 配信ディレクトリをリポジトリの外に用意する
# (リポジトリ直下の assets/ は画像・フォント置き場なので流用しない)
WORK=~/voicevox-assets
mkdir -p "$WORK/2026-09-08" && cd "$WORK/2026-09-08"
# --fail: HTTP エラーを成功扱いにしない / --retry: 一時的な通信エラーは再試行する
curl -LO --fail --retry 3 https://github.com/r9y9/open_jtalk/releases/download/v1.11.1/open_jtalk_dic_utf_8-1.11.tar.gz
tar xzf open_jtalk_dic_utf_8-1.11.tar.gz && rm open_jtalk_dic_utf_8-1.11.tar.gz
curl -LO --fail --retry 3 https://github.com/VOICEVOX/voicevox_vvm/releases/download/0.16.4/6.vvm
cd -   # リポジトリへ戻る

# マニフェストを生成する (version は省略時に今日の日付)。
# 出力先は資産ディレクトリの外にする (中に書くと manifest.json 自身が配信対象に混ざる)
node scripts/build-voicevox-manifest.mjs "$WORK/2026-09-08" https://example.invalid/voicevox/2026-09-08 2026-09-08 > "$WORK/manifest.json"
# 生成に失敗するとリダイレクト先に空ファイルだけが残るので、中身があることを確かめる
test -s "$WORK/manifest.json"
```

できあがる `$WORK` は次の構成で、これをそのまま配信先（例では `https://example.invalid/voicevox/`）へ置く。

```text
voicevox/
├── manifest.json
└── 2026-09-08/                        … base-url に対応するディレクトリ
    ├── 6.vvm                          … VOICEVOX:No.7 (style 29/30/31)
    └── open_jtalk_dic_utf_8-1.11/
        ├── sys.dic  unk.dic  char.bin  matrix.bin
        ├── left-id.def  right-id.def  pos-id.def  rewrite.def
        └── COPYING
```

資産は `base-url` 配下に同じ相対パスで置く必要があるが、`manifest.json` は `base-url` の外でもよい。
ただし Remote Config `voicevox_tts_manifest_url_ios` に入れる URL は **https 必須**
（`http://` はアプリ側の検証で弾かれ、資産を取得しない）。取得は認証なしの GET なので、
https で公開できる静的ホスティングであれば何でもよい。ファイルサイズの目安は辞書が 107MB（`sys.dic` が 103MB）、
VVM が 55〜63MB。

配信先が Cloudflare R2（バケット `trainlcd-assets`、独自ドメイン `assets.trainlcd.app`）なら、
バケット作成・ドメイン紐付け・アップロード・マニフェスト生成と配置・到達確認を
`scripts/publish-voicevox-assets.mjs` が一括で行う。Cloudflare API を `curl` で直接呼ぶだけなので
wrangler のインストールは不要で、何度実行しても同じ結果になる。

```bash
# 手元の Mac で実行する場合。トークンはシェルの環境変数で渡す
export CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_ZONE_ID=… CLOUDFLARE_API_TOKEN=…
node scripts/publish-voicevox-assets.mjs "$WORK/2026-09-08" 2026-09-08
# → Remote Config: voicevox_tts_manifest_url_ios = https://assets.trainlcd.app/voicevox/manifest.json
```

トークンに必要な権限は「Workers R2 Storage: Edit」と、`trainlcd.app` ゾーンの「DNS: Edit」
（独自ドメインの紐付けが DNS レコードを作る）だけでよい。作業後は失効させて構わない。
Claude Code のクラウド環境から実行する場合は、トークンを環境変数に入れず、環境設定の
「API credentials」に `api.cloudflare.com` 向けの Bearer トークンとして登録する（プロキシが
Authorization ヘッダーを付けるので、セッションからはトークンが見えない）。アカウント ID と
ゾーン ID は秘密ではないので環境変数でよい。
マニフェストは `voicevox/manifest.json` の固定 URL に 5 分キャッシュで置くので、資産を差し替えても
Remote Config の値は変えなくてよい。

資産を差し替えるときは新しい `version`（別ディレクトリ）で同じ手順を繰り返す。
アプリは `version` の変化で全ファイルを取り直し、旧ディレクトリを消す。

### staging 配信先

マニフェストは `voicevox/manifest.json` の固定パスに置くので、本番バケットの資産を差し替えると
公開した瞬間に全端末へ効く。canary で先に確かめられるよう、配信先ごと分けてある。

| 環境 | R2 バケット | ホスト | 参照する `CONFIG_KV` |
| --- | --- | --- | --- |
| 本番 | `trainlcd-assets` | `assets.trainlcd.app` | production（`trainlcd-worker`） |
| staging | `trainlcd-assets-dev` | `assets-stg.trainlcd.app` | dev（`trainlcd-worker-dev`。canary アプリはこちらを向く） |

バケットが `-dev`、ホストが `-stg` で揃っていないのは、既存の命名の混在
（`trainlcd-uploads-dev` ↔ `uploads-dev.trainlcd.app` / `stationapi-stg` ↔ `gql-stg.trainlcd.app`）に
合わせた結果で、ここだけ直しても全体は揃わないため意図的にこの組み合わせにしている。

`scripts/publish-voicevox-assets.mjs` は配信先を環境変数で切り替えられるので、staging でも同じ
スクリプトを使う。バケット作成と独自ドメインの紐付けも、存在しなければ作る形で同じ実行に含まれる。

```bash
export CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_ZONE_ID=… CLOUDFLARE_API_TOKEN=…
export VOICEVOX_R2_BUCKET=trainlcd-assets-dev
export VOICEVOX_ASSETS_HOST=assets-stg.trainlcd.app
node scripts/publish-voicevox-assets.mjs "$WORK/2026-09-10" 2026-09-10
# → dev の Remote Config: voicevox_tts_manifest_url_ios = https://assets-stg.trainlcd.app/voicevox/manifest.json
```

Remote Config は dev 側の `voicevox_tts_manifest_url_ios` だけを staging の URL に向け、production 側は
`assets.trainlcd.app` のまま据え置く。canary で確認できたら、同じ資産セット（同じ `version`）を
本番バケットへも公開する。

## Remote Config

| キー | 型 | フォールバック | 役割 |
| --- | --- | --- | --- |
| `voicevox_tts_enabled_ios` | boolean | `false` | VOICEVOX フォールバックの有効化 |
| `voicevox_tts_manifest_url_ios` | string (https) | 未設定 | マニフェスト JSON の URL。未設定なら有効でも資産を取得できない |
| `voicevox_tts_style_id_ios` | integer ≥ 0 | `30` | スタイル ID。配信した VVM に含まれる ID を指定する |

`remote_tts_enabled_ios` とは独立している。リモート合成を主経路のまま「フォールバック先だけ」を
差し替える設計で、`voicevox_tts_enabled_ios` を `false` にすれば取得済みの資産があっても
端末内蔵 TTS へ戻る。

## 音声とクレジット

既定は **No.7「アナウンス」**（`6.vvm` / スタイル ID 30）。No.7 の規約は個人の非商用利用を
クレジット表記のみで許諾している（商用利用は事前確認が必要）。本アプリは課金・広告を持たない
個人開発のため非商用利用に当たるが、**課金や広告を将来入れる場合は再確認が必要**。

VOICEVOX 音声モデルの利用規約（[voicevox_vvm README](https://github.com/VOICEVOX/voicevox_vvm)）は
「VOICEVOX を利用したことがわかるクレジット表記」を求める。ライセンス画面
（`src/screens/Licenses.tsx`）に `VOICEVOX:No.7` を iOS でのみ表示している。スタイル ID を
別キャラクターへ変えるときは、そのキャラクターの規約とクレジット表記も合わせて変えること。

## 未計測の項目

この実装は Linux 上で作成しており、iOS 実機での動作確認・計測は未実施。取り込み前に
次を確認すること。

- Xcode でのビルド（`pod install` 後にアーカイブが通るか。フレームワークの埋め込みと署名）
- 初回フォールバック時の発話開始までの時間（合成器構築 + 合成）と 2 回目以降の合成時間
- 位置情報・Live Activity と同居した背景実行中のメモリ（合成器常駐時）と発熱
- カタカナ入力時のアクセント。漢字を渡した方が自然なら `toSpeakableText` の
  VOICEVOX 向け分岐を検討する

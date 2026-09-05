# リモート TTS 設計書

自動アナウンスの読み上げ手段は 2 つあり、どちらを使うかは Remote Config の
`remote_tts_enabled_ios` / `remote_tts_enabled_android` が決める（[停止スイッチ](#停止スイッチ)）。

| 読み上げ手段 | 合成 | 再生 |
| --- | --- | --- |
| リモート TTS | Worker `/tts` 経由の Google Cloud TTS（女性声 `ja-JP-Standard-B` / `en-US-Standard-G`） | `expo-audio` |
| 端末内蔵 TTS | 端末内蔵 TTS (`expo-speech`) | 端末内蔵 TTS |

キー未配信・取得失敗時のフォールバックは **iOS = リモート TTS / Android = 端末内蔵 TTS**
で、これは Remote Config を一切配信しなかった場合の既定動作でもある。Android は文字数
課金が発生するため、`remote_tts_enabled_android` を `true` で配信したときにだけ `/tts` を
参照する。

リモート合成に失敗した回は、その放送だけ端末内蔵 TTS で読み上げる。圏外・トンネル・
API 障害でアナウンスが丸ごと欠落しないようにするためのフォールバックで、恒久的な
切り替えではない（次の放送では再びリモート合成を試みる）。

## 構成

```text
useTTS ────────────────── 放送タイミング・抑止判定・音声セッション・保留キュー
  ├─ useRemoteSpeechEngine  /tts へ合成要求 → expo-audio で再生
  └─ useNativeSpeechEngine  リモートを使わない構成の常用経路 / リモートのフォールバック
```

エンジンの選択は放送直前に `isRemoteTTSEnabled()`（`src/lib/remoteConfig.ts`）を引いて
決めるため、起動後に Remote Config が届いた場合も次の放送から反映される。

両エンジンは `SpeechEngine` (`src/hooks/tts/speechEngine.ts`) を実装する。

- `speak(request, callbacks)` — `onSettled` か `onUnavailable` のどちらかが
  ちょうど 1 回だけ呼ばれる。
- `onUnavailable` は「音声を一切生成できず発話しなかった」場合のみ。再生が始まった
  後の失敗は `onSettled` で終える（途中まで読み上げた放送を頭から読み直さない）。
- `stop()` — 進行中の発話を中断し、ネイティブ資源を解放する。コールバックは呼ばない。

## 他アプリ音声のダッキング

読み上げ中だけ他アプリ（音楽など）の音量を下げる。仕組みはプラットフォームで異なる。

| プラットフォーム | 仕組み | 実装 |
| --- | --- | --- |
| iOS | `AVAudioSession` のカテゴリオプション (`duckOthers`) | `useTTS` の `setDuckingActiveAsync` |
| Android | オーディオフォーカス (`AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`) | `modules/audio-focus`（`src/utils/speechAudioFocus.ts` 経由） |

iOS の `AVSpeechSynthesizer` はアプリの音声セッションを共有するため、`expo-audio` の
`setAudioModeAsync` に `duckOthers` を指定すれば端末内蔵 TTS・リモート TTS のどちらでも
ダッキングされる。ダッキングは発話の直前にだけ張り、完了後は `mixWithOthers` へ戻す
（張ったままにすると、再生停止後も他アプリの音量が復元されないことがある）。

Android のダッキングはオーディオフォーカスの要求でしか起きない。`expo-audio` の Android
実装は `setAudioModeAsync` では `interruptionMode` を保持するだけで、フォーカスを要求するのは
プレイヤーが再生を開始したときだけである。リモート TTS は `expo-audio` で再生するのでこれに
乗るが、端末内蔵 TTS (`expo-speech`) は `android.speech.tts.TextToSpeech` を直接呼ぶだけで
`AudioManager` に触れないため、フォーカスが一度も要求されずダッキングが起きない。そのため
`useNativeSpeechEngine` は、発話の直前と直後に Android 専用のローカル Expo モジュール
`modules/audio-focus` でフォーカスを取得・返却する。

このモジュールはネイティブコードを含むため、反映にはネイティブビルドが必要で
OTA アップデートでは配信されない。

## 端末内蔵 TTS の音声選択

端末内蔵 TTS はどの音声で合成するかで音質が大きく変わる。選択は
`selectBestVoiceIdentifier()`（`src/utils/nativeTtsVoice.ts`）が行い、言語ごとに
1 つの音声識別子を決めて `expo-speech` へ渡す。

Android は音声の明示指定が必須である。`expo-speech` の Android 実装は `speak` の
`language` を `Locale` へ渡すが、音声データが端末に無い言語では `setLanguage` が
`LANG_MISSING_DATA` となり端末既定言語へフォールバックし、英語文が日本語音声で
合成されてしまう。`voice` を指定すれば `setVoice` が言語設定ごと上書きするため、
この不備の影響を受けない。そのため Android では高品質音声が無くても既定品質の
ローカル音声を明示指定する（`allowDefaultQuality`）。iOS はユーザーが OS 設定で
選んだ既定音声を尊重し、拡張（Enhanced）/ プレミアム（Premium）音声がある場合だけ
明示指定する。

`expo-speech` が返す `quality` は `Enhanced` / `Default` の 2 値に丸められており、
Google TTS の日本語ローカル音声のように `QUALITY_NORMAL` へ横並びになる端末では
優劣を判定できない。判断材料が尽きると識別子のアルファベット順で決まってしまい、
品質と無関係に `ja-jp-x-htm-local` が常に選ばれ、ユーザーが端末設定で選んだ音声も
無視される。これを避けるため `patches/expo-speech+57.0.1.patch` で
`android.speech.tts.Voice` の生の情報を JS へ渡している。

| フィールド | 由来 | 用途 |
| --- | --- | --- |
| `qualityScore` | `Voice.getQuality()`（100〜500） | ローカル音声同士の優劣を判定する |
| `isDefault` | `TextToSpeech.defaultVoice` と一致するか | 端末設定でのユーザーの選択を尊重する |
| `networkRequired` | `Voice.isNetworkConnectionRequired()` | 識別子の `network` 判定より正確にローカル音声を選ぶ |
| `notInstalled` | `Voice.getFeatures()` の `notInstalled` | 音声データ未取得で合成できない音声を避ける |

いずれも iOS では返らないため、iOS では従来どおり識別子と `quality` で判定する。

優先順は次のとおりで、上から順に比較して差がついた時点で決まる。

1. インストール済み — 音声データが無い音声は合成できない
1. ローカル音声 — 乗車中はトンネル等で接続が切れるため、ネットワーク音声は最後の手段
1. 地域一致 — `en-US` 要求時に `en-GB` より `en-US` を選ぶ
1. 端末既定音声 — ユーザーの明示的な選択を機械的な優劣より優先する
1. `qualityScore` 降順 — Android の生の品質値
1. 識別子ベースの品質判定 — iOS の `premium` > `enhanced` > その他
1. 識別子の昇順 — 実行ごとに音声が変わらないようにする最後のタイブレーク

最下段まで差がつかない場合にだけ識別子順に落ちる。ここへ到達するのは判断材料が
出尽くしたときだけなので、品質と無関係な順序で音声が決まる範囲を最小化している。

選択結果は起動時に 1 度だけ `[useNativeSpeechEngine] Selected voices: ...` として
ログへ残す。端末ごとに音声のラインナップが違い、音質の問い合わせは実機でどの音声が
選ばれたかが分からないと切り分けられないため。

生メタデータの露出は `expo-speech` へのネイティブ patch なので、反映には
ネイティブビルドが必要で OTA アップデートでは配信されない。patch が当たっていない
バイナリでは各フィールドが `undefined` となり、従来どおり識別子順のタイブレークへ
フォールバックする。

## テキストの前処理

TTS テンプレートは SSML 断片を生成するが、Cloud TTS（`input.text`）も `expo-speech` も
SSML を解釈せずタグをそのまま読み上げる。そのため双方のエンジンが
`toSpeakableText()` (`src/utils/speakableText.ts`) でプレーンテキストへ変換してから
合成へ渡す。

- `<sub alias="ヨミ">表記</sub>` → 読み (`ヨミ`)
- `<break/>` → 日本語は `、`、英語は半角スペース
- 「JR」→ 日本語 `ジェーアール` / 英語 `J-R`（`Jr.` = ジュニアとの誤読を防ぐ）
- 英語文に混入した日本語は除去する

Cloud TTS の Standard 系ボイスは読み方のプロンプト指示を受け付けないため、アプリが
指定するのはボイス名（`src/constants/tts.ts`）だけで、読み上げ速度・声の高さは
Worker 側の設定（`TTS_SPEED` / `TTS_PITCH`）で決まる。

## Worker `/tts` の契約

アプリ側は以下を送受信する。Worker 側の実装は
[TrainLCD/functions](https://github.com/TrainLCD/functions) の
`src/routes/tts.ts` にある（GraphQL API の StationAPI とは別リポジトリ）。

### リクエスト

`POST /tts` / `Authorization: Bearer <セッショントークン>`

```json
{
  "data": {
    "textJa": "次は、オオサキです",
    "textEn": "The next station is Osaki, J Y 24.",
    "jaVoiceName": "ja-JP-Standard-B",
    "enVoiceName": "en-US-Standard-G"
  }
}
```

ボイス名は `<言語>-<地域>-<系統>-<記号>` でロケールを含むため、日英で同じ名前は
使えない（OpenAI 時代の `nova` のような多言語プリセットは存在しない）。

合成は文字数課金のため、**ユーザーが無効にしている言語のフィールドは送らない**。
`textJa` のみ・`textEn` のみのリクエストが正常系として発生するので、Worker は
届いた言語だけを合成すること。

### レスポンス

```json
{
  "result": {
    "id": "一意なID（キャッシュファイル名に使う）",
    "jaAudioContent": "<base64>",
    "enAudioContent": "<base64>",
    "jaAudioMimeType": "audio/mpeg",
    "enAudioMimeType": "audio/mpeg"
  }
}
```

- 要求した言語の音声が欠けている応答は失敗として扱い、端末内蔵 TTS へフォールバック
  する。要求していない言語のフィールドは省略してよい。
- 音声は既定で MP3 (`audio/mpeg`)。Worker の `TTS_RESPONSE_FORMAT` を変えると
  WAV (`audio/wav`) でも返せるが、アプリが再生できない形式を選ばないこと。
- MIME タイプは省略可。省略時はアプリ側が先頭バイトから MP3 / WAV を判定し、どちらとも
  判定できない場合のみ生 PCM (16bit LE / 24kHz) とみなして WAV ヘッダーを付与する。
  誤判定を避けるため、可能な限り MIME タイプを返すこと。

### サーバー側の実装メモ

合成エンジンは Google Cloud Text-to-Speech（`text:synthesize`、サービスアカウント認証）。
OpenAI 版・Azure Speech 版からは全面移行済みで、旧エンジン向けのコード・環境変数・
シークレットは削除された。アプリ側と対応が取れている前提は以下のとおり。

- ボイス名は Worker 側で許可制（実在を確認済みの Standard / Wavenet / Neural2 のみ。
  単価が桁違いの Studio・Chirp3-HD・Gemini-TTS は名指しできない）。未知の値は
  リクエスト → KV(`config:tts`) → `TTS_*` 環境変数の順にフォールバックするため、
  旧バージョンのアプリが OpenAI 時代のボイス名（`nova`）を送っても 400 にはならず
  既定の女性声で合成される。
- `model` / `instructionsJa` / `instructionsEn` は OpenAI 時代のフィールド。Standard 系
  ボイスにはモデル指定も読み方のプロンプト指示も無いため、Worker は受け取っても
  無視する（旧バージョンのアプリからの呼び出しを壊さないための互換）。当バージョンの
  アプリは送らない。
- 入力上限は Worker 側が UTF-8 **バイト**で検証する（4000 バイト）。アプリ側も
  同じバイト数で丸める（`REMOTE_TTS_MAX_INPUT_BYTES`）ので、文字数と
  バイト数の食い違いで無用なフォールバックが起きない。
- Worker は受け取ったテキストにも `stripSsml` をかける。タグが紛れ込んでも
  読み上げさせないための二重防御で、プレーンテキストには作用しない。
- 英語は Worker 側で `normalizeRomanText`（全角記号・略記・長音符の吸収）を
  通す。アプリが確定させた `J-R` を崩さないよう、ハイフン区切りの頭字語は
  そのまま残す。

## 停止スイッチ

Remote Config のキーは 2 系統あり、役割が異なる。

- `tts_enabled_ios` / `tts_enabled_android` — TTS 機能自体のキルスイッチ
  （`useTTSFeatureEnabled`）。`false` のときは読み上げを行わず、設定画面のトグルも
  無効化する。フォールバックは `true`（提供する）。
- `remote_tts_enabled_ios` / `remote_tts_enabled_android` — 読み上げエンジンの選択
  （`isRemoteTTSEnabled`）。`true` でリモート合成、`false` で端末内蔵 TTS。
  フォールバックは iOS が `true`、Android が `false`。

両者は独立しているため、次のような運用ができる。

- **Android でもリモート合成を使う**: `remote_tts_enabled_android` を `true` にする。
  段階的に開放したい場合はこのキーだけで切り戻せる。
- **リモート合成のコスト・障害から退避する**: `remote_tts_enabled_*` を `false` にすると、
  TTS 機能は維持したまま端末内蔵 TTS へ倒れる。読み上げごと止めたい場合のみ
  `tts_enabled_*` を `false` にする。

iOS / Android 以外（web など）はリモート再生経路を持たないため、`isRemoteTTSEnabled()`
は常に `false` を返す。

## キャッシュ

`fetchSpeechAudio` はテキスト・音声名をキーに合成結果のファイルパスを
メモリへ保持する（上限 `MAX_FETCH_CACHE_SIZE` 件、超過時は最古から破棄）。同一文面の
再放送では再合成しないため、折り返し運転や同じ駅を繰り返し通る経路で課金が膨らまない。

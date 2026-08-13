# リモート TTS 設計書

自動アナウンスの読み上げ手段は 2 つあり、どちらを使うかは Remote Config の
`remote_tts_enabled_ios` / `remote_tts_enabled_android` が決める（[停止スイッチ](#停止スイッチ)）。

| 読み上げ手段 | 合成 | 再生 |
| --- | --- | --- |
| リモート TTS | Worker `/tts` 経由の `gpt-4o-mini-tts`（女性声 `nova`） | `expo-audio` |
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
useTTS ────────────────── 放送タイミング・抑止判定・ダッキング・保留キュー
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

## テキストの前処理

TTS テンプレートは SSML 断片を生成するが、`gpt-4o-mini-tts` も `expo-speech` も
SSML を解釈せずタグをそのまま読み上げる。そのため双方のエンジンが
`toSpeakableText()` (`src/utils/speakableText.ts`) でプレーンテキストへ変換してから
合成へ渡す。

- `<sub alias="ヨミ">表記</sub>` → 読み (`ヨミ`)
- `<break/>` → 日本語は `、`、英語は半角スペース
- 「JR」→ 日本語 `ジェーアール` / 英語 `J-R`（`Jr.` = ジュニアとの誤読を防ぐ）
- 英語文に混入した日本語は除去する

`gpt-4o-mini-tts` は SSML の代わりに `instructions` で読み方を指示するため、声色・
速度・間の取り方は `src/constants/tts.ts` の定数で渡す。

## Worker `/tts` の契約

アプリ側は以下を送受信する。Worker 側の実装は
[TrainLCD/functions](https://github.com/TrainLCD/functions) の
`src/routes/tts.ts` にある（GraphQL BFF とは別リポジトリ）。

### リクエスト

`POST /tts` / `Authorization: Bearer <セッショントークン>`

```json
{
  "data": {
    "textJa": "次は、オオサキです",
    "textEn": "The next station is Osaki, J Y 24.",
    "model": "gpt-4o-mini-tts",
    "jaVoiceName": "nova",
    "enVoiceName": "nova",
    "instructionsJa": "鉄道の車内自動放送のアナウンサーとして…",
    "instructionsEn": "Read this as an automated train announcement…"
  }
}
```

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
- MIME タイプは省略可。省略時はアプリ側が先頭バイトから MP3 / WAV を判定し、どちらとも
  判定できない場合のみ生 PCM (16bit LE / 24kHz) とみなして WAV ヘッダーを付与する。
  誤判定を避けるため、可能な限り MIME タイプを返すこと。

### サーバー側の実装メモ

Azure Speech 版から全面移行済み（Azure 関連のコード・環境変数・シークレットは
削除された）。アプリ側と対応が取れている前提は以下のとおり。

- ボイス名とモデルは Worker 側で許可制。未知の値はリクエスト → KV(`config:tts`)
  → `TTS_*` 環境変数の順にフォールバックするため、アプリが古いボイス名を送っても
  400 にはならず既定の女性声で合成される。
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

`fetchSpeechAudio` はテキスト・モデル・音声名をキーに合成結果のファイルパスを
メモリへ保持する（上限 `MAX_FETCH_CACHE_SIZE` 件、超過時は最古から破棄）。同一文面の
再放送では再合成しないため、折り返し運転や同じ駅を繰り返し通る経路で課金が膨らまない。

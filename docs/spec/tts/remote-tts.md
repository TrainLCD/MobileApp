# リモート TTS (iOS) 設計書

自動アナウンスの読み上げ手段はプラットフォームで異なる。

| プラットフォーム | 合成 | 再生 |
| --- | --- | --- |
| iOS | Worker `/tts` 経由の `gpt-4o-mini-tts`（女性声 `nova`） | `expo-audio` |
| Android | 端末内蔵 TTS (`expo-speech`) | 端末内蔵 TTS |

iOS でリモート合成に失敗した回は、その放送だけ端末内蔵 TTS で読み上げる。圏外・
トンネル・API 障害でアナウンスが丸ごと欠落しないようにするためのフォールバックで、
恒久的な切り替えではない（次の放送では再びリモート合成を試みる）。

## 構成

```text
useTTS ────────────────── 放送タイミング・抑止判定・ダッキング・保留キュー
  ├─ useRemoteSpeechEngine  iOS: /tts へ合成要求 → expo-audio で再生
  └─ useNativeSpeechEngine  Android の常用経路 / iOS のフォールバック
```

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

> **未対応**: 現行の `/tts` は Azure Speech 専用で、この契約をまだ満たしていない。
> 詳細と必要な作業は「[現行 `/tts` との差分](#現行-tts-との差分)」を参照。

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

## 現行 `/tts` との差分

現行の [TrainLCD/functions](https://github.com/TrainLCD/functions)
`src/routes/tts.ts` は **Azure Speech 専用**で、上記の契約とは以下が食い違う。
そのため gpt-4o-mini-tts での合成にはサーバー側の実装が必要で、それまで iOS は
毎回フォールバックして端末内蔵 TTS で読み上げる（クラッシュも無音も起きないが、
女性声 TTS にはならない）。

| 項目 | 現行 `/tts` | 本設計が要求するもの |
| --- | --- | --- |
| 合成エンジン | Azure Speech | OpenAI `gpt-4o-mini-tts` |
| 入力 | `ssmlJa` / `ssmlEn`（両方必須・SSML） | `textJa` / `textEn`（プレーンテキスト・片方のみ可） |
| 声の指定 | Azure ボイス名（`<locale>-<Name>Neural` 形式のみ受理） | `nova` などの OpenAI ボイス名 |
| 読み方の指示 | `mstts:express-as` / `prosody`（env 経由） | `instructions` |
| モデル指定 | なし | `model` |

変わらないもの:

- 認証（`Authorization: Bearer <セッショントークン>`）と callable 互換の
  ワイヤ形式（`{ data: … }` / `{ result: … }` / `{ error: { message, status } }`）
- レスポンスの `id` / `*AudioContent` / `*AudioMimeType`
- KV/R2 による合成結果キャッシュの考え方（キーに `model` と `voice`、
  `instructions` を含める必要がある点だけ追加）

サーバー側実装時の注意:

- `OPENAI_API_KEY` は `Env` に既にある（AI エージェントが使用）ため、
  新たなシークレット追加は不要。
- 現行の入力上限は可視テキスト 4000 バイト・生 SSML 10000 バイト。プレーン
  テキスト化で同等のバイト数ガードを維持すること（アプリ側は文字数ベースで
  `REMOTE_TTS_MAX_INPUT_LENGTH` に丸めるだけなので、バイト数の防衛は
  サーバー側が担う）。
- 片言語のみのリクエストが正常系として来る。両方必須のバリデーションは外し、
  届いた言語だけ合成して対応する `*AudioContent` を返す。

## 停止スイッチ

Remote Config の `tts_enabled_ios` / `tts_enabled_android` が既存のキルスイッチで、
プラットフォーム単位で TTS 機能ごと停止できる（`useTTSFeatureEnabled`）。リモート
合成のコストや障害で iOS の読み上げを止めたい場合は `tts_enabled_ios` を `false` に
する。リモート合成だけを止めて端末内蔵 TTS へ倒す専用スイッチは現時点では持たない。

## キャッシュ

`fetchSpeechAudio` はテキスト・モデル・音声名をキーに合成結果のファイルパスを
メモリへ保持する（上限 `MAX_FETCH_CACHE_SIZE` 件、超過時は最古から破棄）。同一文面の
再放送では再合成しないため、折り返し運転や同じ駅を繰り返し通る経路で課金が膨らまない。

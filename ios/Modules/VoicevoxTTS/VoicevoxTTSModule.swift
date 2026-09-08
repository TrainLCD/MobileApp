import CryptoKit
import Foundation
import UIKit
import voicevox_core

// VOICEVOX CORE (https://github.com/VOICEVOX/voicevox_core) で日本語アナウンスを
// 端末内で合成する React Native モジュール。
//
// - iOS 向けのリリース物は ONNX Runtime をロード時に動的リンクする
//   (`VOICEVOX_LINK_ONNXRUNTIME`) ため、voicevox_onnxruntime.framework も
//   一緒に埋め込む。初期化は `voicevox_onnxruntime_init_once` で行う。
// - Open JTalk 辞書と音声モデル (VVM) はアプリに同梱せず、JS 側
//   (src/lib/voicevox/assets.ts) が初回利用時にダウンロードしたパスを `setup` で受け取る。
// - VOICEVOX CORE の C API はスレッドセーフを保証していないため、全操作を
//   1 本の直列キューで実行する。合成は数秒かかることがあるので JS スレッドや
//   メインスレッドでは決して実行しない。
// - 合成器は VVM を展開したまま保持するため常駐メモリが大きい。メモリ警告を
//   受けたら解放し、次の合成時に同じ設定で作り直す。
@objc(VoicevoxTTSModule)
final class VoicevoxTTSModule: NSObject {
  private struct Config: Equatable {
    let openJtalkDicDir: String
    let voiceModelPaths: [String]
    let cpuNumThreads: UInt16
  }

  private let queue = DispatchQueue(
    label: "me.tinykitten.trainlcd.voicevox", qos: .userInitiated)
  // queue 上で実行中かを判定するためのキー。queue.async のクロージャが self の最後の
  // 所有者になると deinit が queue 上で走るため、そこで queue.sync するとデッドロックする
  private let queueSpecificKey = DispatchSpecificKey<Bool>()

  // 以下は queue 上でのみ触る
  private var config: Config?
  private var openJtalk: OpaquePointer?
  private var synthesizer: OpaquePointer?
  private var loadedStyleIds: [UInt32] = []

  private var memoryWarningObserver: NSObjectProtocol?

  override init() {
    super.init()
    queue.setSpecific(key: queueSpecificKey, value: true)
    memoryWarningObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.didReceiveMemoryWarningNotification,
      object: nil,
      queue: nil
    ) { [weak self] _ in
      guard let self = self else { return }
      self.queue.async {
        // 設定は残し、次回の synthesize で再構築する
        self.teardownSynthesizer()
      }
    }
  }

  deinit {
    if let observer = memoryWarningObserver {
      NotificationCenter.default.removeObserver(observer)
    }
    if DispatchQueue.getSpecific(key: queueSpecificKey) != nil {
      teardownSynthesizer()
    } else {
      queue.sync {
        teardownSynthesizer()
      }
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // MARK: - Errors

  private enum VoicevoxError: Error, CustomStringConvertible {
    case invalidArgument(String)
    // C API の戻り値型。ヘッダーが `enum VoicevoxResultCode` と `typedef int32_t VoicevoxResultCode`
    // の両方を定義するため Swift では型名 `VoicevoxResultCode` の参照が曖昧になる。typedef の実体である Int32 で扱う
    case core(String, Int32)
    case notInitialized
    case io(String)

    var description: String {
      switch self {
      case .invalidArgument(let message):
        return message
      case .core(let operation, let code):
        let message = String(cString: voicevox_error_result_to_message(code))
        return "\(operation) failed: \(message) (code \(code))"
      case .notInitialized:
        return "synthesizer is not initialized"
      case .io(let message):
        return message
      }
    }

    var code: String {
      switch self {
      case .invalidArgument: return "invalid_argument"
      case .core: return "voicevox_core_error"
      case .notInitialized: return "not_initialized"
      case .io: return "io_error"
      }
    }
  }

  // cbindgen 生成ヘッダーは `enum X {…}; typedef int32_t X;` の形で、Swift には列挙と
  // Int32 の typealias が同名で取り込まれる。型名 `VoicevoxResultCode` /
  // `VoicevoxAccelerationMode` を Swift 側で書くと "ambiguous for type lookup" になるため、
  // typedef の実体 Int32 で扱い、定数はヘッダーの値をそのまま書く (フレームワークの版は
  // ios/Frameworks/voicevox-frameworks.json で固定している)。
  // voicevox_core.h: VOICEVOX_RESULT_OK = 0
  private static let resultOK: Int32 = 0
  // voicevox_core.h: VOICEVOX_ACCELERATION_MODE_CPU = 1
  private static let accelerationModeCPU: Int32 = 1

  private func check(_ result: Int32, _ operation: String) throws {
    if result != Self.resultOK {
      throw VoicevoxError.core(operation, result)
    }
  }

  private func rejectWithError(_ reject: RCTPromiseRejectBlock, _ error: Error) {
    if let error = error as? VoicevoxError {
      reject(error.code, error.description, nil)
    } else {
      reject("voicevox_error", error.localizedDescription, error)
    }
  }

  // MARK: - Lifecycle (queue 上で呼ぶ)

  private func teardownSynthesizer() {
    if let synthesizer = synthesizer {
      voicevox_synthesizer_delete(synthesizer)
      self.synthesizer = nil
    }
    if let openJtalk = openJtalk {
      voicevox_open_jtalk_rc_delete(openJtalk)
      self.openJtalk = nil
    }
    loadedStyleIds = []
  }

  private func buildSynthesizer(_ config: Config) throws {
    teardownSynthesizer()

    var onnxruntime: OpaquePointer?
    try check(voicevox_onnxruntime_init_once(&onnxruntime), "voicevox_onnxruntime_init_once")

    var openJtalk: OpaquePointer?
    try check(
      voicevox_open_jtalk_rc_new(config.openJtalkDicDir, &openJtalk),
      "voicevox_open_jtalk_rc_new")
    self.openJtalk = openJtalk

    var options = voicevox_make_default_initialize_options()
    options.acceleration_mode = Self.accelerationModeCPU
    options.cpu_num_threads = config.cpuNumThreads

    var synthesizer: OpaquePointer?
    do {
      try check(
        voicevox_synthesizer_new(onnxruntime, openJtalk, options, &synthesizer),
        "voicevox_synthesizer_new")
    } catch {
      teardownSynthesizer()
      throw error
    }
    self.synthesizer = synthesizer

    var styleIds: [UInt32] = []
    for path in config.voiceModelPaths {
      var model: OpaquePointer?
      do {
        try check(
          voicevox_voice_model_file_open(path, &model), "voicevox_voice_model_file_open")
      } catch {
        // 失敗した合成器を残すと ensureSynthesizer が再構築を省略してしまう
        teardownSynthesizer()
        throw error
      }
      defer {
        if let model = model {
          voicevox_voice_model_file_delete(model)
        }
      }
      let loadOptions = voicevox_make_default_load_voice_model_options()
      do {
        try check(
          voicevox_synthesizer_load_voice_model(synthesizer, model, loadOptions),
          "voicevox_synthesizer_load_voice_model")
      } catch {
        teardownSynthesizer()
        throw error
      }
      if let model = model {
        styleIds.append(contentsOf: Self.styleIds(ofModel: model))
      }
    }
    loadedStyleIds = styleIds
    self.config = config
  }

  // VVM のメタ情報 JSON からスタイル ID を取り出す。JS 側が Remote Config で
  // 指定したスタイルがモデルに含まれているかを検証できるようにするため。
  private static func styleIds(ofModel model: OpaquePointer) -> [UInt32] {
    guard let json = voicevox_voice_model_file_create_metas_json(model) else {
      return []
    }
    defer { voicevox_json_free(json) }
    let data = Data(bytes: json, count: strlen(json))
    guard
      let speakers = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]
    else {
      return []
    }
    var ids: [UInt32] = []
    for speaker in speakers {
      guard let styles = speaker["styles"] as? [[String: Any]] else { continue }
      for style in styles {
        if let id = style["id"] as? UInt32 {
          ids.append(id)
        } else if let id = style["id"] as? Int, id >= 0 {
          ids.append(UInt32(id))
        }
      }
    }
    return ids
  }

  private func ensureSynthesizer() throws {
    if synthesizer != nil {
      return
    }
    guard let config = config else {
      throw VoicevoxError.notInitialized
    }
    try buildSynthesizer(config)
  }

  // MARK: - JS API

  // 辞書ディレクトリと VVM のパスを受け取り合成器を初期化する。同じ設定で既に
  // 初期化済みなら何もしない。設定が変わっていれば作り直す。
  @objc(setup:resolver:rejecter:)
  func setup(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let dicDir = options["openJtalkDicDir"] as? String, !dicDir.isEmpty else {
      self.rejectWithError(reject, VoicevoxError.invalidArgument("openJtalkDicDir is required"))
      return
    }
    guard let modelPaths = options["voiceModelPaths"] as? [String], !modelPaths.isEmpty
    else {
      self.rejectWithError(reject, VoicevoxError.invalidArgument("voiceModelPaths is required"))
      return
    }
    let threads = (options["cpuNumThreads"] as? NSNumber)?.uint16Value ?? 0
    let config = Config(
      openJtalkDicDir: dicDir, voiceModelPaths: modelPaths, cpuNumThreads: threads)

    queue.async {
      do {
        if self.synthesizer == nil || self.config != config {
          try self.buildSynthesizer(config)
        }
        resolve([
          "coreVersion": String(cString: voicevox_get_version()),
          "styleIds": self.loadedStyleIds.map { NSNumber(value: $0) },
        ])
      } catch {
        self.rejectWithError(reject, error)
      }
    }
  }

  // テキストを合成し WAV ファイル (24kHz / 16bit / mono) を outputPath へ書き出す。
  // speedScale は VOICEVOX の AudioQuery.speedScale (1.0 が標準)。
  @objc(synthesize:resolver:rejecter:)
  func synthesize(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let text = options["text"] as? String, !text.isEmpty else {
      self.rejectWithError(reject, VoicevoxError.invalidArgument("text is required"))
      return
    }
    guard let styleId = (options["styleId"] as? NSNumber)?.uint32Value else {
      self.rejectWithError(reject, VoicevoxError.invalidArgument("styleId is required"))
      return
    }
    guard let outputPath = options["outputPath"] as? String, !outputPath.isEmpty else {
      self.rejectWithError(reject, VoicevoxError.invalidArgument("outputPath is required"))
      return
    }
    let speedScale = (options["speedScale"] as? NSNumber)?.doubleValue ?? 1.0

    queue.async {
      do {
        try self.ensureSynthesizer()
        guard let synthesizer = self.synthesizer else {
          throw VoicevoxError.notInitialized
        }

        // 速度を変えるため tts ではなく audio_query → synthesis の 2 段で合成する
        var queryJson: UnsafeMutablePointer<CChar>?
        try self.check(
          voicevox_synthesizer_create_audio_query(synthesizer, text, styleId, &queryJson),
          "voicevox_synthesizer_create_audio_query")
        guard let queryJson = queryJson else {
          throw VoicevoxError.io("audio query was not returned")
        }
        defer { voicevox_json_free(queryJson) }

        let query = try Self.applySpeedScale(
          Data(bytes: queryJson, count: strlen(queryJson)), speedScale: speedScale)

        // JSONSerialization の出力は UTF-8 なので Swift の String に戻し、C 文字列として渡す
        let queryString = String(decoding: query, as: UTF8.self)
        var wavLength: UInt = 0
        var wav: UnsafeMutablePointer<UInt8>?
        let synthesisOptions = voicevox_make_default_synthesis_options()
        try self.check(
          voicevox_synthesizer_synthesis(
            synthesizer, queryString, styleId, synthesisOptions, &wavLength, &wav),
          "voicevox_synthesizer_synthesis")
        guard let wav = wav else {
          throw VoicevoxError.io("wav buffer was not returned")
        }
        defer { voicevox_wav_free(wav) }

        let data = Data(bytes: wav, count: Int(wavLength))
        let url = URL(fileURLWithPath: outputPath)
        try FileManager.default.createDirectory(
          at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: url, options: .atomic)

        resolve([
          "path": outputPath,
          "bytes": NSNumber(value: data.count),
        ])
      } catch {
        self.rejectWithError(reject, error)
      }
    }
  }

  // AudioQuery JSON の speedScale だけを書き換える。AudioQuery の他フィールドは
  // VOICEVOX CORE が生成したものをそのまま返す。
  private static func applySpeedScale(_ json: Data, speedScale: Double) throws -> Data {
    guard var query = try JSONSerialization.jsonObject(with: json) as? [String: Any] else {
      throw VoicevoxError.io("audio query is not a JSON object")
    }
    // 極端な値で合成が破綻しないよう VOICEVOX エディタと同じ範囲へ丸める
    query["speedScale"] = min(max(speedScale, 0.5), 2.0)
    return try JSONSerialization.data(withJSONObject: query)
  }

  // 合成器と辞書を解放する。設定も破棄するので、次に使うときは setup からやり直す。
  @objc(release:rejecter:)
  func release(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    queue.async {
      self.teardownSynthesizer()
      self.config = nil
      resolve(nil)
    }
  }

  // ダウンロードした辞書・VVM の完全性検証用。100MB 超のファイルを JS へ読み込まずに
  // ストリーミングでハッシュする。
  @objc(sha256:resolver:rejecter:)
  func sha256(
    _ path: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .utility).async {
      do {
        let handle = try FileHandle(forReadingFrom: URL(fileURLWithPath: path))
        defer { try? handle.close() }
        var hasher = SHA256()
        while true {
          let chunk = try handle.read(upToCount: 1 << 20) ?? Data()
          if chunk.isEmpty {
            break
          }
          hasher.update(data: chunk)
        }
        let digest = hasher.finalize().map { String(format: "%02x", $0) }.joined()
        resolve(digest)
      } catch {
        reject("io_error", "failed to hash \(path): \(error.localizedDescription)", error)
      }
    }
  }

  // ダウンロードした辞書・VVM は再取得できるので iCloud バックアップから除外する
  @objc(setExcludedFromBackup:resolver:rejecter:)
  func setExcludedFromBackup(
    _ path: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      var url = URL(fileURLWithPath: path)
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try url.setResourceValues(values)
      resolve(nil)
    } catch {
      reject("io_error", "failed to exclude \(path) from backup: \(error.localizedDescription)", error)
    }
  }
}

import CryptoKit
import Foundation
import UIKit

// VITS (https://github.com/k2-fsa/icefall の LJSpeech レシピで学習された ONNX モデル) で
// 英語アナウンスを端末内で合成する React Native モジュール。
//
// - 推論には既に埋め込んである voicevox_onnxruntime.framework (素の ONNX Runtime 1.23.2) を
//   使う。この framework が公開しているシンボルは OrtGetApiBase と
//   OrtSessionOptionsAppendExecutionProvider_CPU の 2 つだけだが、ONNX Runtime の C API は
//   OrtGetApiBase から全関数ポインタを引く設計なので、これだけで足りる。
//   VITS 専用に ONNX Runtime をもう 1 つ埋め込むとアプリが約 47MB 大きくなるため共用している
//   (VOICEVOX をやめるときも、この framework と取得スクリプトの定義は残す必要がある)。
// - 音声モデルと発音辞書はアプリに同梱せず、JS 側 (src/lib/vits/assets.ts) が初回利用時に
//   ダウンロードしたパスを `setup` で受け取る。
// - ONNX Runtime のセッションはスレッドセーフだが、辞書の読み込みと解放を含めた
//   状態遷移を単純に保つため、全操作を 1 本の直列キューで実行する。合成は数秒かかる
//   ことがあるので JS スレッドやメインスレッドでは決して実行しない。
// - セッションと辞書は常駐メモリが大きいため、メモリ警告を受けたら解放し、
//   次の合成時に同じ設定で作り直す。
@objc(VitsTTSModule)
final class VitsTTSModule: NSObject {
  private struct Config: Equatable {
    let modelPath: String
    let tokensPath: String
    let lexiconPath: String
    let cpuNumThreads: Int32
  }

  private let queue = DispatchQueue(
    label: "me.tinykitten.trainlcd.vits", qos: .userInitiated)
  // queue 上で実行中かを判定するためのキー。queue.async のクロージャが self の最後の
  // 所有者になると deinit が queue 上で走るため、そこで queue.sync するとデッドロックする
  private let queueSpecificKey = DispatchSpecificKey<Bool>()

  // 以下は queue 上でのみ触る
  private var config: Config?
  private var env: OpaquePointer?
  private var sessionOptions: OpaquePointer?
  private var session: OpaquePointer?
  private var dictionary: VitsPhonemizer.Dictionary?
  private var sampleRate: Int32 = 22050
  private var addBlank = true

  private var memoryWarningObserver: NSObjectProtocol?

  // 文と文の間に挟む無音の長さ(秒)。VITS は 1 文ずつ推論するため、繋いだだけだと
  // 文の切れ目が詰まって聞こえる。
  private static let sentenceGapSeconds: Double = 0.2

  // VITS の推論パラメータ。sherpa-onnx の OfflineTtsVitsModelConfig と同じ既定値で、
  // モデルの学習時設定に対応する。
  private static let noiseScale: Float = 0.667
  private static let noiseScaleW: Float = 0.8

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
        self.teardownSession()
      }
    }
  }

  deinit {
    if let observer = memoryWarningObserver {
      NotificationCenter.default.removeObserver(observer)
    }
    if DispatchQueue.getSpecific(key: queueSpecificKey) != nil {
      teardownSession()
    } else {
      queue.sync {
        teardownSession()
      }
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // MARK: - ONNX Runtime

  // voicevox_onnxruntime.framework が公開する唯一の入口から C API を引く。
  private static let ortApi: UnsafePointer<OrtApi>? = {
    guard let base = OrtGetApiBase(), let getApi = base.pointee.GetApi else {
      return nil
    }
    return getApi(UInt32(ORT_API_VERSION))
  }()

  private enum VitsError: Error, CustomStringConvertible {
    case invalidArgument(String)
    case runtimeUnavailable
    case ort(String, String)
    case notInitialized
    case unreadableText([String])
    case io(String)

    var description: String {
      switch self {
      case .invalidArgument(let message):
        return message
      case .runtimeUnavailable:
        return "ONNX Runtime is unavailable"
      case .ort(let operation, let message):
        return "\(operation) failed: \(message)"
      case .notInitialized:
        return "synthesizer is not initialized"
      case .unreadableText(let words):
        return "text contains words this voice cannot read: \(words.joined(separator: ", "))"
      case .io(let message):
        return message
      }
    }

    var code: String {
      switch self {
      case .invalidArgument: return "invalid_argument"
      case .runtimeUnavailable: return "runtime_unavailable"
      case .ort: return "onnxruntime_error"
      case .notInitialized: return "not_initialized"
      case .unreadableText: return "unreadable_text"
      case .io: return "io_error"
      }
    }
  }

  private func api() throws -> UnsafePointer<OrtApi> {
    guard let api = Self.ortApi else {
      throw VitsError.runtimeUnavailable
    }
    return api
  }

  /// OrtStatus が返ってきたらメッセージを取り出して例外にする。成功時は nil が返る。
  private func check(_ status: OpaquePointer?, _ operation: String) throws {
    guard let status = status else { return }
    let api = try api()
    let message = api.pointee.GetErrorMessage.map { getMessage -> String in
      guard let raw = getMessage(status) else { return "unknown error" }
      return String(cString: raw)
    } ?? "unknown error"
    api.pointee.ReleaseStatus!(status)
    throw VitsError.ort(operation, message)
  }

  private func rejectWithError(_ reject: RCTPromiseRejectBlock, _ error: Error) {
    if let error = error as? VitsError {
      reject(error.code, error.description, nil)
    } else {
      reject("vits_error", error.localizedDescription, error)
    }
  }

  // MARK: - Lifecycle (queue 上で呼ぶ)

  private func teardownSession() {
    guard let api = Self.ortApi else { return }
    if let session = session {
      api.pointee.ReleaseSession!(session)
      self.session = nil
    }
    if let sessionOptions = sessionOptions {
      api.pointee.ReleaseSessionOptions!(sessionOptions)
      self.sessionOptions = nil
    }
    if let env = env {
      api.pointee.ReleaseEnv!(env)
      self.env = nil
    }
    dictionary = nil
  }

  private func buildSession(_ config: Config) throws {
    teardownSession()
    let api = try api()

    var env: OpaquePointer?
    try check(
      api.pointee.CreateEnv!(ORT_LOGGING_LEVEL_WARNING, "trainlcd-vits", &env),
      "CreateEnv")
    self.env = env

    var options: OpaquePointer?
    try check(api.pointee.CreateSessionOptions!(&options), "CreateSessionOptions")
    self.sessionOptions = options
    if config.cpuNumThreads > 0 {
      try check(
        api.pointee.SetIntraOpNumThreads!(options, config.cpuNumThreads),
        "SetIntraOpNumThreads")
    }
    try check(
      api.pointee.SetSessionGraphOptimizationLevel!(options, ORT_ENABLE_ALL),
      "SetSessionGraphOptimizationLevel")

    var session: OpaquePointer?
    do {
      try check(
        api.pointee.CreateSession!(env, config.modelPath, options, &session),
        "CreateSession")
    } catch {
      // 失敗したセッションを残すと ensureSession が再構築を省略してしまう
      teardownSession()
      throw error
    }
    self.session = session

    do {
      try readModelMetadata(session: session)
      dictionary = try VitsPhonemizer.Dictionary(
        tokensPath: config.tokensPath, lexiconPath: config.lexiconPath)
    } catch {
      teardownSession()
      throw error
    }
    self.config = config
  }

  /// サンプリングレートと add_blank をモデルのメタデータから読む。マニフェストへ
  /// 二重に持たせるとモデル差し替え時に片方だけ古くなるため、モデル本体を正とする。
  private func readModelMetadata(session: OpaquePointer?) throws {
    let api = try api()
    var metadata: OpaquePointer?
    try check(
      api.pointee.SessionGetModelMetadata!(session, &metadata),
      "SessionGetModelMetadata")
    defer { api.pointee.ReleaseModelMetadata!(metadata) }

    var allocator: UnsafeMutablePointer<OrtAllocator>?
    try check(
      api.pointee.GetAllocatorWithDefaultOptions!(&allocator),
      "GetAllocatorWithDefaultOptions")

    func lookup(_ key: String) -> String? {
      var value: UnsafeMutablePointer<CChar>?
      let status = api.pointee.ModelMetadataLookupCustomMetadataMap!(
        metadata, allocator, key, &value)
      if let status = status {
        api.pointee.ReleaseStatus!(status)
        return nil
      }
      guard let value = value else { return nil }
      defer { _ = api.pointee.AllocatorFree!(allocator, value) }
      return String(cString: value)
    }

    guard let rate = lookup("sample_rate").flatMap({ Int32($0) }), rate > 0 else {
      throw VitsError.io("model metadata has no usable sample_rate")
    }
    sampleRate = rate
    // add_blank が無いモデルは blank を挟まない学習とみなす
    addBlank = (lookup("add_blank").flatMap { Int($0) } ?? 0) != 0
  }

  private func ensureSession() throws {
    if session != nil && dictionary != nil {
      return
    }
    guard let config = config else {
      throw VitsError.notInitialized
    }
    try buildSession(config)
  }

  // MARK: - 推論

  /// 1 文ぶんのトークン ID 列を推論して PCM (-1.0〜1.0) を返す。
  private func runSentence(_ ids: [Int64], lengthScale: Float) throws -> [Float] {
    let api = try api()
    guard let session = session else {
      throw VitsError.notInitialized
    }

    var memoryInfo: OpaquePointer?
    try check(
      api.pointee.CreateCpuMemoryInfo!(OrtArenaAllocator, OrtMemTypeDefault, &memoryInfo),
      "CreateCpuMemoryInfo")
    defer { api.pointee.ReleaseMemoryInfo!(memoryInfo) }

    // CreateTensorWithDataAsOrtValue はバッファをコピーしないため、Run が終わるまで
    // 生かしておく必要がある。スコープを跨ぐので手動で確保する。
    let xBuffer = UnsafeMutablePointer<Int64>.allocate(capacity: ids.count)
    xBuffer.initialize(from: ids, count: ids.count)
    let lengthBuffer = UnsafeMutablePointer<Int64>.allocate(capacity: 1)
    lengthBuffer.initialize(to: Int64(ids.count))
    let scaleBuffer = UnsafeMutablePointer<Float>.allocate(capacity: 3)
    scaleBuffer[0] = Self.noiseScale
    scaleBuffer[1] = lengthScale
    scaleBuffer[2] = Self.noiseScaleW
    defer {
      xBuffer.deallocate()
      lengthBuffer.deallocate()
      scaleBuffer.deallocate()
    }

    var values: [OpaquePointer?] = []
    defer {
      for value in values {
        api.pointee.ReleaseValue!(value)
      }
    }

    func makeTensor(
      _ data: UnsafeMutableRawPointer,
      _ byteCount: Int,
      _ shape: [Int64],
      _ type: ONNXTensorElementDataType,
      _ operation: String
    ) throws -> OpaquePointer? {
      var value: OpaquePointer?
      try shape.withUnsafeBufferPointer { shapePtr in
        try check(
          api.pointee.CreateTensorWithDataAsOrtValue!(
            memoryInfo, data, byteCount, shapePtr.baseAddress, shape.count, type, &value),
          operation)
      }
      values.append(value)
      return value
    }

    let x = try makeTensor(
      xBuffer, ids.count * MemoryLayout<Int64>.size, [1, Int64(ids.count)],
      ONNX_TENSOR_ELEMENT_DATA_TYPE_INT64, "CreateTensor(x)")
    let xLength = try makeTensor(
      lengthBuffer, MemoryLayout<Int64>.size, [1],
      ONNX_TENSOR_ELEMENT_DATA_TYPE_INT64, "CreateTensor(x_length)")
    let noise = try makeTensor(
      scaleBuffer, MemoryLayout<Float>.size, [1],
      ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT, "CreateTensor(noise_scale)")
    let length = try makeTensor(
      scaleBuffer + 1, MemoryLayout<Float>.size, [1],
      ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT, "CreateTensor(length_scale)")
    let noiseW = try makeTensor(
      scaleBuffer + 2, MemoryLayout<Float>.size, [1],
      ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT, "CreateTensor(noise_scale_w)")

    // 入力名・出力名はモデル (vits-ljs) の定義そのもの。
    let inputNames = ["x", "x_length", "noise_scale", "length_scale", "noise_scale_w"]
    let outputNames = ["y"]
    let inputNamePointers = inputNames.map { strdup($0) }
    let outputNamePointers = outputNames.map { strdup($0) }
    defer {
      inputNamePointers.forEach { free($0) }
      outputNamePointers.forEach { free($0) }
    }

    var inputs: [OpaquePointer?] = [x, xLength, noise, length, noiseW]
    var outputs: [OpaquePointer?] = [nil]
    let inputNameArgs = inputNamePointers.map { UnsafePointer($0) }
    let outputNameArgs = outputNamePointers.map { UnsafePointer($0) }

    try inputNameArgs.withUnsafeBufferPointer { inNames in
      try inputs.withUnsafeMutableBufferPointer { inValues in
        try outputNameArgs.withUnsafeBufferPointer { outNames in
          try outputs.withUnsafeMutableBufferPointer { outValues in
            try check(
              api.pointee.Run!(
                session, nil, inNames.baseAddress, inValues.baseAddress, inputs.count,
                outNames.baseAddress, outputNameArgs.count, outValues.baseAddress),
              "Run")
          }
        }
      }
    }
    guard let output = outputs[0] else {
      throw VitsError.io("inference returned no output")
    }
    defer { api.pointee.ReleaseValue!(output) }

    var shapeInfo: OpaquePointer?
    try check(
      api.pointee.GetTensorTypeAndShape!(output, &shapeInfo), "GetTensorTypeAndShape")
    defer { api.pointee.ReleaseTensorTypeAndShapeInfo!(shapeInfo) }
    var elementCount = 0
    try check(
      api.pointee.GetTensorShapeElementCount!(shapeInfo, &elementCount),
      "GetTensorShapeElementCount")
    guard elementCount > 0 else {
      return []
    }

    var raw: UnsafeMutableRawPointer?
    try check(api.pointee.GetTensorMutableData!(output, &raw), "GetTensorMutableData")
    guard let raw = raw else {
      throw VitsError.io("inference output has no data")
    }
    let samples = UnsafeBufferPointer(
      start: raw.assumingMemoryBound(to: Float.self), count: elementCount)
    return Array(samples)
  }

  // MARK: - WAV

  /// 16bit PCM / モノラルの WAV を書き出す。
  private func writeWav(samples: [Float], to path: String) throws -> Int {
    var data = Data()
    let dataSize = samples.count * MemoryLayout<Int16>.size

    func appendUInt32(_ value: UInt32) {
      withUnsafeBytes(of: value.littleEndian) { data.append(contentsOf: $0) }
    }
    func appendUInt16(_ value: UInt16) {
      withUnsafeBytes(of: value.littleEndian) { data.append(contentsOf: $0) }
    }

    data.append(contentsOf: Array("RIFF".utf8))
    appendUInt32(UInt32(36 + dataSize))
    data.append(contentsOf: Array("WAVE".utf8))
    data.append(contentsOf: Array("fmt ".utf8))
    appendUInt32(16)
    appendUInt16(1)  // PCM
    appendUInt16(1)  // モノラル
    appendUInt32(UInt32(sampleRate))
    appendUInt32(UInt32(sampleRate) * 2)  // バイト毎秒 = レート × チャンネル × 2byte
    appendUInt16(2)  // ブロックサイズ
    appendUInt16(16)  // ビット深度
    data.append(contentsOf: Array("data".utf8))
    appendUInt32(UInt32(dataSize))

    var pcm = [Int16]()
    pcm.reserveCapacity(samples.count)
    for sample in samples {
      // モデルの出力はごく稀に ±1.0 を超えるため、折り返しが起きないよう丸める
      let clamped = min(max(sample, -1.0), 1.0)
      pcm.append(Int16(clamped * 32767))
    }
    pcm.withUnsafeBufferPointer { buffer in
      data.append(
        UnsafeBufferPointer(
          start: UnsafeRawPointer(buffer.baseAddress!).assumingMemoryBound(to: UInt8.self),
          count: dataSize))
    }

    let url = URL(fileURLWithPath: path)
    try FileManager.default.createDirectory(
      at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    try data.write(to: url, options: .atomic)
    return data.count
  }

  // MARK: - React Native

  // 音声モデルと発音辞書を読み込む。同じ設定なら何もしない。
  @objc(setup:resolver:rejecter:)
  func setup(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard
      let modelPath = options["modelPath"] as? String,
      let tokensPath = options["tokensPath"] as? String,
      let lexiconPath = options["lexiconPath"] as? String
    else {
      reject(
        "invalid_argument", "modelPath, tokensPath and lexiconPath are required", nil)
      return
    }
    let cpuNumThreads = (options["cpuNumThreads"] as? NSNumber)?.int32Value ?? 0
    let config = Config(
      modelPath: modelPath,
      tokensPath: tokensPath,
      lexiconPath: lexiconPath,
      cpuNumThreads: cpuNumThreads)

    queue.async {
      do {
        if self.config != config || self.session == nil || self.dictionary == nil {
          try self.buildSession(config)
        }
        resolve([
          "sampleRate": NSNumber(value: self.sampleRate),
          "addBlank": NSNumber(value: self.addBlank),
        ])
      } catch {
        self.rejectWithError(reject, error)
      }
    }
  }

  // テキストを合成して WAV を書き出す。
  @objc(synthesize:resolver:rejecter:)
  func synthesize(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard
      let text = options["text"] as? String,
      let outputPath = options["outputPath"] as? String
    else {
      reject("invalid_argument", "text and outputPath are required", nil)
      return
    }
    // 極端な値で合成が破綻しないよう、VOICEVOX 側の speedScale と同じ範囲へ丸める
    let speed = min(max((options["speed"] as? NSNumber)?.doubleValue ?? 1.0, 0.5), 2.0)

    queue.async {
      do {
        try self.ensureSession()
        guard let dictionary = self.dictionary else {
          throw VitsError.notInitialized
        }

        let converted = VitsPhonemizer.tokenIds(
          text: text, dictionary: dictionary, addBlank: self.addBlank)
        guard converted.unreadableWords.isEmpty else {
          // 駅名が黙って欠けたアナウンスを流さないため、読めない語があれば合成しない。
          // JS 側はこの回だけ端末内蔵 TTS へ倒す。
          throw VitsError.unreadableText(converted.unreadableWords)
        }
        guard !converted.sentences.isEmpty else {
          throw VitsError.invalidArgument("text has nothing to speak")
        }

        // length_scale は「1 音素あたりの長さの倍率」なので、速さの逆数を渡す
        let lengthScale = Float(1.0 / speed)
        let gapSamples = Int(Double(self.sampleRate) * Self.sentenceGapSeconds)
        var samples: [Float] = []
        for (index, sentence) in converted.sentences.enumerated() {
          if index > 0 {
            samples.append(contentsOf: [Float](repeating: 0, count: gapSamples))
          }
          samples.append(contentsOf: try self.runSentence(sentence, lengthScale: lengthScale))
        }
        guard !samples.isEmpty else {
          throw VitsError.io("inference produced no audio")
        }

        let bytes = try self.writeWav(samples: samples, to: outputPath)
        resolve([
          "path": outputPath,
          "bytes": NSNumber(value: bytes),
        ])
      } catch {
        self.rejectWithError(reject, error)
      }
    }
  }

  // セッションと辞書を解放する。設定も破棄するので、次に使うときは setup からやり直す。
  @objc(release:rejecter:)
  func release(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    queue.async {
      self.teardownSession()
      self.config = nil
      resolve(nil)
    }
  }

  // ダウンロードしたモデル・辞書の完全性検証用。100MB 超のファイルを JS へ読み込まずに
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

  // ダウンロードしたモデル・辞書は再取得できるので iCloud バックアップから除外する
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
      reject(
        "io_error", "failed to exclude \(path) from backup: \(error.localizedDescription)",
        error)
    }
  }
}

// signingConfigs ブロック内では `java` が Gradle の java 拡張に解決され java.io.File を
// 完全修飾名で参照できないため、ここで import しておく。
import java.io.File

plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
  id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" // this version matches your Kotlin version
}

android {
  namespace = "me.tinykitten.trainlcd"
  compileSdk = 35

  signingConfigs {
    // Wear OS の Data Layer はパッケージ名と署名の両方が一致する場合のみ
    // スマホ・ウォッチ間の通信を許可する。AGP 既定の ~/.android/debug.keystore を
    // 使うと :app と証明書が食い違い、ローカルの debug ビルド同士で疎通できないため、
    // :app と同じ鍵を明示的に指定する。
    getByName("debug") {
      storeFile = file("../app/debug.keystore")
      storePassword = "android"
      keyAlias = "androiddebugkey"
      keyPassword = "android"
    }

    // release も :app と同じアップロード鍵で署名する。debug 鍵で署名した AAB は Play の
    // アップロード鍵と一致せず受け付けられないため、:app の signingConfigs.release と
    // 同じ TRAINLCD_UPLOAD_* プロパティを参照する。TRAINLCD_UPLOAD_STORE_FILE は :app
    // モジュール起点の相対パス (例: release.jks) として運用されているため、:wearable からは
    // app/ を基準に解決する。項目が欠けた signingConfig を割り当てると署名タスクが NPE で
    // 落ちるため、4 つのプロパティが揃っている場合のみ生成する（未設定時は未署名になる）。
    // 値は trim せず isNotBlank() のみで判定する（パスワード前後の空白を壊さないため）。
    val uploadStoreFile = (findProperty("TRAINLCD_UPLOAD_STORE_FILE") as String?)?.takeIf { it.isNotBlank() }
    val uploadStorePassword = (findProperty("TRAINLCD_UPLOAD_STORE_PASSWORD") as String?)?.takeIf { it.isNotBlank() }
    val uploadKeyAlias = (findProperty("TRAINLCD_UPLOAD_KEY_ALIAS") as String?)?.takeIf { it.isNotBlank() }
    val uploadKeyPassword = (findProperty("TRAINLCD_UPLOAD_KEY_PASSWORD") as String?)?.takeIf { it.isNotBlank() }
    if (uploadStoreFile != null &&
      uploadStorePassword != null &&
      uploadKeyAlias != null &&
      uploadKeyPassword != null
    ) {
      create("release") {
        val keystore = File(uploadStoreFile)
        storeFile = if (keystore.isAbsolute) keystore else rootProject.file("app/$uploadStoreFile")
        storePassword = uploadStorePassword
        keyAlias = uploadKeyAlias
        keyPassword = uploadKeyPassword
      }
    }
  }

  defaultConfig {
    applicationId = "me.tinykitten.trainlcd"
    minSdk = 34
    targetSdk = 35
    vectorDrawables {
      useSupportLibrary = true
    }
  }

  buildTypes {
    debug {
      signingConfig = signingConfigs.getByName("debug")
    }
    release {
      signingConfig = signingConfigs.findByName("release")
      isMinifyEnabled = true
      isShrinkResources = true
      proguardFiles(
        getDefaultProguardFile("proguard-android-optimize.txt"),
        "proguard-rules.pro"
      )
    }
  }

  flavorDimensions += "environment"
  productFlavors {
    // :app と applicationId が同じマルチバンドル配信のため、Play は minSdk が高い側
    // (:wearable=34 > :app=24) の versionCode が高いことを要求する。逆転すると Wear バンドルが
    // 常に :app に順位負けし、どの端末にも配信されないためリリースを公開できなくなる。
    // そのため versionCode は必ず「:app の versionCode + 1」に保つ。この追従は
    // scripts/bump-version.js が機械的に行うので、手作業で編集しないこと。
    create("dev") {
      dimension = "environment"
      applicationIdSuffix = ".dev"
      versionNameSuffix = "-dev"
      versionCode = 100000612
      versionName = "10.13.0"
    }
    create("prod") {
      dimension = "environment"
      versionCode = 100000612
      versionName = "10.13.0"
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_1_8
    targetCompatibility = JavaVersion.VERSION_1_8
  }
  kotlinOptions {
    jvmTarget = "17"
  }
  buildFeatures {
    compose = true
  }
  composeOptions {
    kotlinCompilerExtensionVersion = "1.5.15"
  }
}

dependencies {
  implementation("androidx.core:core-ktx:1.15.0")
  implementation("com.google.android.gms:play-services-wearable:19.0.0")
  implementation("androidx.percentlayout:percentlayout:1.0.0")
  implementation("androidx.legacy:legacy-support-v4:1.0.0")
  implementation("androidx.recyclerview:recyclerview:1.4.0")
  implementation(platform("androidx.compose:compose-bom:2025.01.01"))
  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.ui:ui-tooling-preview")
  implementation("androidx.wear:wear:1.3.0")
  implementation("androidx.wear.compose:compose-material:1.4.0")
  implementation("androidx.wear.compose:compose-foundation:1.4.0")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
  implementation("androidx.activity:activity-compose:1.10.0")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")
  implementation("androidx.wear:wear-remote-interactions:1.1.0")
  implementation("androidx.wear:wear-phone-interactions:1.0.1")
  implementation("androidx.core:core-splashscreen:1.2.0-beta02")
  androidTestImplementation(platform("androidx.compose:compose-bom:2025.01.01"))
  androidTestImplementation("androidx.compose.ui:ui-test-junit4")
  debugImplementation("androidx.compose.ui:ui-tooling")
  debugImplementation("androidx.compose.ui:ui-test-manifest")
}

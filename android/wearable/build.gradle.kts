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
      signingConfig = signingConfigs.getByName("debug")
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
    create("dev") {
      dimension = "environment"
      applicationIdSuffix = ".dev"
      versionNameSuffix = "-dev"
      versionCode = 100000000
      versionName = "10.0.0"
    }
    create("prod") {
      dimension = "environment"
      versionCode = 100000000
      versionName = "10.0.0"
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

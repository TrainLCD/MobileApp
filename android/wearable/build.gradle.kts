plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
}

android {
  namespace = "me.tinykitten.trainlcd"
  compileSdk = 35

  defaultConfig {
    applicationId = "me.tinykitten.trainlcd"
    minSdk = 30
    targetSdk = 33
    vectorDrawables {
      useSupportLibrary = true
    }

  }

  buildTypes {
    release {
      isMinifyEnabled = false
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
      // 10203011 <- 10203(v1.2.3 version name)+01(build number)+1(Wearable app)
      versionCode = 80300001
      versionName = "8.3.0"
    }
    create("prod") {
      dimension = "environment"
      versionCode = 80300001
      versionName = "8.3.0"
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
    kotlinCompilerExtensionVersion = "1.5.14"
  }
}

dependencies {
  implementation("androidx.core:core-ktx:1.8.0")
  implementation("com.google.android.gms:play-services-wearable:18.0.0")
  implementation("androidx.percentlayout:percentlayout:1.0.0")
  implementation("androidx.legacy:legacy-support-v4:1.0.0")
  implementation("androidx.recyclerview:recyclerview:1.3.0")
  implementation(platform("androidx.compose:compose-bom:2022.10.00"))
  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.ui:ui-tooling-preview")
  implementation("androidx.wear:wear:1.2.0")
  implementation("androidx.wear.compose:compose-material:1.0.0")
  implementation("androidx.wear.compose:compose-foundation:1.0.0")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.5.1")
  implementation("androidx.activity:activity-compose:1.5.1")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.1")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.1")
  implementation("androidx.wear:wear-remote-interactions:1.0.0")
  implementation("androidx.wear:wear-phone-interactions:1.0.1")
  androidTestImplementation(platform("androidx.compose:compose-bom:2022.10.00"))
  androidTestImplementation("androidx.compose.ui:ui-test-junit4")
  debugImplementation("androidx.compose.ui:ui-tooling")
  debugImplementation("androidx.compose.ui:ui-test-manifest")
}

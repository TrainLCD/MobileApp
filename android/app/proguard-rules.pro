# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Expo modules (Headless tasks, notifications, etc.)
-keep class expo.modules.** { *; }

# WorkManager initializes its Room database through AndroidX Startup before React Native starts.
# AGP 9 / R8 can remove these reflectively invoked no-arg constructors even when the
# classes are kept by Room 2.5.0 / WorkManager 2.9.1. Preserve constructors explicitly.
# https://github.com/expo/expo/pull/51349
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class * extends androidx.work.InputMerger { <init>(); }

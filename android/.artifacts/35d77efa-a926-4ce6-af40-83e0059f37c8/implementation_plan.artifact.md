# Fix Warnings and Errors in Android Configuration

This plan addresses the warnings identified in the Android build configuration and enhances the splash screen implementation to ensure a smooth transition.

## User Review Required

> [!NOTE]
> I am updating the `compileSdk` and `targetSdkVersion` to 37 (Android 15) to resolve IDE warnings about outdated versions.

## Proposed Changes

### Build Configuration

#### [MODIFY] [variables.gradle](file:///C:/espn-fantasy-basketball analyzer/android/variables.gradle)
- Update `compileSdkVersion` and `targetSdkVersion` to 37.

#### [MODIFY] [build.gradle](file:///C:/espn-fantasy-basketball analyzer/android/app/build.gradle)
- Update `compileSdk` to use the version defined in `variables.gradle`.

### UI and Lifecycle

#### [MODIFY] [styles.xml](file:///C:/espn-fantasy-basketball analyzer/android/app/src/main/res/values/styles.xml)
- Add `postSplashScreenTheme` to `AppTheme.NoActionBarLaunch` to correctly transition after the splash screen.

#### [MODIFY] [MainActivity.java](file:///C:/espn-fantasy-basketball analyzer/android/app/src/main/java/com/draftadvisor/app/MainActivity.java)
- Call `SplashScreen.installSplashScreen(this)` before `super.onCreate(savedInstanceState)` to initialize the new Splash Screen API.

## Verification Plan

### Automated Tests
- Run `./gradlew assembleDebug` to ensure the project still builds correctly.
- Run `./gradlew lintDebug` to verify that the SDK version warnings are resolved.

### Manual Verification
- Deploy the app to a device/emulator and verify that the splash screen displays correctly and transitions to the main app without a blank screen or crash.

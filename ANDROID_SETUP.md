# Android Setup Guide

## Quick Setup Steps

### 1. Install Android SDK
On Arch Linux / CachyOS, you can install Android SDK using:

```bash
# Using yay (AUR helper)
yay -S android-sdk android-sdk-platform-tools android-sdk-build-tools

# OR install Android Studio (includes SDK)
yay -S android-studio
```

### 2. Set Android SDK Path
After installation, configure Flutter to use the SDK:

```bash
# If installed via package manager
export ANDROID_HOME=/opt/android-sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# Configure Flutter
flutter config --android-sdk $ANDROID_HOME
```

### 3. Accept Android Licenses
```bash
flutter doctor --android-licenses
```

### 4. Create an Android Emulator (Optional)
```bash
# List available system images
sdkmanager --list | grep system-images

# Create AVD (Android Virtual Device)
# This is easier to do through Android Studio's AVD Manager
```

### 5. Run on Android
```bash
# List available devices/emulators
flutter devices

# Run the app
flutter run -d android
```

## Alternative: Use Physical Device

1. Enable Developer Options on your Android device
2. Enable USB Debugging
3. Connect device via USB
4. Run `flutter devices` to verify connection
5. Run `flutter run`

## Quick Start (Already Done!)

✅ Android SDK installed at `~/Android/Sdk`
✅ Android SDK packages installed (platform-tools, build-tools, platforms)
✅ Android licenses accepted
✅ Flutter configured to use Android SDK
✅ Android project structure is configured
✅ Camera permission added (for barcode scanning)
✅ Internet permission added (for API calls)
✅ MainActivity.kt is properly set up
✅ Environment variables added to fish config

## Next Steps to Run on Android

### Option 1: Create and Use an Emulator

Run the provided script to create an emulator:
```bash
./create_android_emulator.sh
```

Then start the emulator:
```bash
# Using Flutter (recommended)
flutter emulators --launch flutter_emulator

# OR manually
~/Android/Sdk/emulator/emulator -avd flutter_emulator &
```

Once the emulator is running:
```bash
flutter run -d android
```

### Option 2: Use a Physical Device

1. Enable Developer Options on your Android device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   
2. Enable USB Debugging:
   - Go to Settings → Developer Options
   - Enable "USB Debugging"
   
3. Connect your device via USB

4. Verify connection:
   ```bash
   flutter devices
   ```

5. Run the app:
   ```bash
   flutter run -d android
   ```


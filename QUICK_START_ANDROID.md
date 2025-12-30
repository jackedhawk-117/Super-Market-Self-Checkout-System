# Quick Start Guide - Running on Android

## ✅ What's Been Set Up

Your Android development environment is now fully configured:

1. ✅ **Android SDK** installed at `~/Android/Sdk`
2. ✅ **Required SDK packages** (platform-tools, build-tools, platforms)
3. ✅ **Android licenses** accepted
4. ✅ **Flutter** configured to use Android SDK
5. ✅ **Android emulator** created (`flutter_emulator`)
6. ✅ **Permissions** added to AndroidManifest.xml:
   - Camera permission (for barcode scanning)
   - Internet permission (for API calls)
7. ✅ **Environment variables** added to fish shell config

## 🚀 Running Your App

### Step 1: Start the Android Emulator

The emulator is currently starting. You can verify it's running with:

```bash
flutter devices
```

If you need to start it manually later:

```bash
# Option 1: Using Flutter
flutter emulators --launch flutter_emulator

# Option 2: Direct emulator command
~/Android/Sdk/emulator/emulator -avd flutter_emulator &
```

**Note:** The emulator takes 1-2 minutes to fully boot up. Wait until you see the Android home screen.

### Step 2: Verify Emulator is Ready

```bash
# Check connected devices
flutter devices

# You should see something like:
# sdk gphone64 x86 64 (mobile) • emulator-5554 • android-x64 • Android 14 (API 34) (emulator)
```

### Step 3: Run Your App

Once the emulator is running and shows up in `flutter devices`:

```bash
cd /home/jackedhawk117/mainproject/Super-Market-Self-Checkout-System
flutter run -d android
```

The app will:
1. Build the Android APK
2. Install it on the emulator
3. Launch the app automatically

## 🔧 Troubleshooting

### If the emulator doesn't appear:

1. Check if it's running:
   ```bash
   ps aux | grep emulator
   ```

2. Check ADB connection:
   ```bash
   ~/Android/Sdk/platform-tools/adb devices
   ```

3. Restart ADB server:
   ```bash
   ~/Android/Sdk/platform-tools/adb kill-server
   ~/Android/Sdk/platform-tools/adb start-server
   ```

### If you see SDK version warnings:

The Flutter doctor warning about "SDK 36" can be ignored - it's a known issue. Your current setup (SDK 34) will work fine for development.

### Using a Physical Device Instead:

1. Enable Developer Options on your Android phone
2. Enable USB Debugging
3. Connect via USB
4. Run `flutter devices` to verify
5. Run `flutter run -d android`

## 📱 Next Steps

- The app should now run on Android!
- Use `flutter run -d android` to launch
- Use `r` in the terminal for hot reload
- Use `R` for hot restart
- Press `q` to quit

## 📝 Environment Setup

Your shell (fish) has been configured with:
```fish
set -gx ANDROID_HOME "$HOME/Android/Sdk"
set -gx PATH $PATH $ANDROID_HOME/cmdline-tools/latest/bin $ANDROID_HOME/platform-tools
```

If you open a new terminal, these will be automatically loaded.


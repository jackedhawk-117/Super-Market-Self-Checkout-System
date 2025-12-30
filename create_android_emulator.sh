#!/bin/bash

# Script to create an Android emulator for Flutter development

set -e

ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"

echo "🤖 Creating Android Emulator..."
echo ""

# Install system image if not already installed
echo "📦 Installing Android system image (this may take a few minutes)..."
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" \
    "system-images;android-34;google_apis;x86_64" || {
    echo "⚠️  Failed to install system image. Trying alternative..."
    "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" \
        "system-images;android-33;google_apis;x86_64"
}

# Create AVD
AVD_NAME="flutter_emulator"
echo ""
echo "🎯 Creating AVD: $AVD_NAME..."

# Check if AVD already exists
if "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" list avd | grep -q "$AVD_NAME"; then
    echo "✅ AVD '$AVD_NAME' already exists."
else
    echo "no" | "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd \
        -n "$AVD_NAME" \
        -k "system-images;android-34;google_apis;x86_64" \
        -d "pixel_5" || {
        echo "Trying with Android 33..."
        echo "no" | "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd \
            -n "$AVD_NAME" \
            -k "system-images;android-33;google_apis;x86_64" \
            -d "pixel_5"
    }
    echo "✅ AVD created successfully!"
fi

echo ""
echo "✅ Android emulator setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start the emulator:"
echo "   $ANDROID_HOME/emulator/emulator -avd $AVD_NAME &"
echo ""
echo "2. OR use Flutter to start it:"
echo "   flutter emulators --launch $AVD_NAME"
echo ""
echo "3. Once emulator is running, verify with:"
echo "   flutter devices"
echo ""
echo "4. Run your app:"
echo "   flutter run -d android"


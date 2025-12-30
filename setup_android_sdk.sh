#!/bin/bash

# Android SDK Setup Script for Flutter
# This script downloads and sets up the Android SDK command-line tools

set -e

ANDROID_HOME="$HOME/Android/Sdk"
SDK_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
SDK_TOOLS_DIR="$ANDROID_HOME/cmdline-tools"

echo "🚀 Setting up Android SDK for Flutter..."
echo ""

# Create Android SDK directory
echo "📁 Creating Android SDK directory at $ANDROID_HOME..."
mkdir -p "$ANDROID_HOME"

# Check if command-line tools already exist
if [ -d "$SDK_TOOLS_DIR/latest" ]; then
    echo "✅ Android SDK command-line tools already exist."
else
    echo "📥 Downloading Android SDK command-line tools..."
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # Download command-line tools
    curl -o cmdline-tools.zip "$SDK_TOOLS_URL" || {
        echo "❌ Failed to download Android SDK. Please check your internet connection."
        exit 1
    }
    
    echo "📦 Extracting command-line tools..."
    unzip -q cmdline-tools.zip -d "$SDK_TOOLS_DIR"
    
    # Move to 'latest' directory as required
    mkdir -p "$SDK_TOOLS_DIR/latest"
    mv "$SDK_TOOLS_DIR/cmdline-tools"/* "$SDK_TOOLS_DIR/latest/" 2>/dev/null || true
    
    cd - > /dev/null
    rm -rf "$TEMP_DIR"
    echo "✅ Android SDK command-line tools installed."
fi

# Add to PATH for current session
export ANDROID_HOME
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

# Install required SDK packages
echo ""
echo "📦 Installing required Android SDK packages..."
echo "This may take a few minutes..."

yes | "$SDK_TOOLS_DIR/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" \
    "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "cmdline-tools;latest" || {
    echo "⚠️  Some packages may have failed to install, continuing..."
}

# Accept licenses
echo ""
echo "📝 Accepting Android licenses..."
yes | "$SDK_TOOLS_DIR/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" --licenses || {
    echo "⚠️  License acceptance may require manual review"
}

# Configure Flutter
echo ""
echo "⚙️  Configuring Flutter to use Android SDK..."
flutter config --android-sdk "$ANDROID_HOME"

# Add to shell config
SHELL_CONFIG=""
if [ -f "$HOME/.bashrc" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
elif [ -f "$HOME/.config/fish/config.fish" ]; then
    SHELL_CONFIG="$HOME/.config/fish/config.fish"
fi

if [ -n "$SHELL_CONFIG" ] && ! grep -q "ANDROID_HOME" "$SHELL_CONFIG"; then
    echo ""
    echo "📝 Adding Android SDK to $SHELL_CONFIG..."
    cat >> "$SHELL_CONFIG" << EOF

# Android SDK
export ANDROID_HOME="\$HOME/Android/Sdk"
export PATH="\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools"
EOF
    echo "✅ Added to $SHELL_CONFIG (restart your terminal or run 'source $SHELL_CONFIG')"
fi

echo ""
echo "✅ Android SDK setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Source your shell config: source $SHELL_CONFIG (or restart terminal)"
echo "2. Verify setup: flutter doctor"
echo "3. Create an emulator or connect a physical device"
echo "4. Run: flutter run -d android"
echo ""


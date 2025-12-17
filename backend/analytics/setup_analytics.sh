#!/bin/bash

echo "========================================"
echo " Setting up Customer Segmentation Analytics"
echo "========================================"
echo

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"
echo

# Install Python dependencies
echo "Installing Python dependencies..."
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Python dependencies installed successfully"
else
    echo "❌ Failed to install Python dependencies"
    echo "Try running: pip3 install pandas numpy scikit-learn"
    exit 1
fi

echo
echo "========================================"
echo " Analytics setup complete!"
echo "========================================"
echo
echo "The customer segmentation feature is now ready to use."
echo "Access it via: GET /api/analytics/segmentation"


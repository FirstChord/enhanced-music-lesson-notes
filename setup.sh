#!/bin/bash

# Enhanced Music Lesson Notes Chrome Extension Setup
echo "🎵 Enhanced Music Lesson Notes Chrome Extension Setup"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: manifest.json not found. Please run this script from the extension directory."
    exit 1
fi

echo "✅ Extension files found!"

# Display current directory
echo "📁 Extension directory: $(pwd)"

# Check manifest version
if grep -q "\"manifest_version\": 3" manifest.json; then
    echo "✅ Manifest V3 detected (modern Chrome extension)"
else
    echo "⚠️  Warning: This extension uses an older manifest version"
fi

echo ""
echo "📋 Installation Instructions:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (top right toggle)"
echo "3. Click 'Load unpacked'"
echo "4. Select this directory: $(pwd)"
echo "5. The extension will appear in your toolbar!"
echo ""
echo "🎤 Usage:"
echo "- Click the extension icon"
echo "- Click 'Start Page Recording'"
echo "- Choose Question Mode (recommended) or Free Flow"
echo "- Start recording your lesson notes!"
echo ""
echo "🔧 Troubleshooting:"
echo "- Ensure you're on an HTTPS website"
echo "- Allow microphone permissions when prompted"
echo "- The extension popup will auto-close during recording"
echo ""
echo "Happy teaching! 🎵"

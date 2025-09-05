#!/bin/bash

# Tutor Tools: Homework Notes Helper - Chrome Web Store Package Creator
echo "🎯 Creating Chrome Web Store package for Tutor Tools..."

# Create package directory
PACKAGE_DIR="tutor-tools-homework-notes-helper-package"
rm -rf "$PACKAGE_DIR"
mkdir "$PACKAGE_DIR"

# Copy essential files for the Chrome Web Store
echo "📦 Copying extension files..."
cp manifest.json "$PACKAGE_DIR/"
cp popup.html "$PACKAGE_DIR/"
cp popup.js "$PACKAGE_DIR/"
cp content.js "$PACKAGE_DIR/"
cp background.js "$PACKAGE_DIR/"
cp textProcessor.js "$PACKAGE_DIR/"

# Create the zip file
echo "🗜️  Creating zip package..."
cd "$PACKAGE_DIR"
zip -r "../tutor-tools-homework-notes-helper.zip" *
cd ..

# Create store assets directory if it doesn't exist
if [ ! -d "store-assets" ]; then
    mkdir store-assets
fi

# Move the zip to store assets
mv "tutor-tools-homework-notes-helper.zip" "store-assets/"

# Cleanup
rm -rf "$PACKAGE_DIR"

echo "✅ Package created successfully!"
echo "📍 Location: store-assets/tutor-tools-homework-notes-helper.zip"
echo ""
echo "📋 Next Steps:"
echo "1. Go to Chrome Web Store Developer Dashboard"
echo "2. Upload the zip file"
echo "3. Add store listing details from STORE_DESCRIPTION.md"
echo "4. Add privacy policy from PRIVACY_POLICY.md"
echo "5. Submit for review"
echo ""
echo "🎉 Your Tutor Tools extension is ready for the Chrome Web Store!"

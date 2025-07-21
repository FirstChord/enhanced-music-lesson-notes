# Enhanced Music Lesson Notes Chrome Extension

A Chrome extension designed to help music teachers quickly record and format professional lesson notes using speech recognition and AI-powered text enhancement.

## Features

### 🎤 Speech Recognition

- **Question Mode**: Guided recording with pre-set questions for structured lesson notes
- **Free Flow Mode**: Natural speech recording for flexible note-taking
- Real-time transcription with live feedback
- Automatic capitalization and punctuation

### 🧠 AI-Enhanced Text Processing

- Removes filler words (um, uh, like, etc.)
- Fixes common speech recognition errors
- Corrects music-specific terminology (scales, chords, intervals, etc.)
- Professional tone improvements
- Grammar and clarity enhancements

### 📝 Professional Formatting

- Structured output with clear question headers
- Proper spacing and formatting for easy reading
- Optimized for MyMusicStaff and other lesson management platforms
- One-click copy to clipboard

### 🎯 User-Friendly Interface

- Smart popup positioning to avoid interference
- Auto-closes extension popup during recording
- Clear visual feedback and status updates
- Responsive design for different screen sizes

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your browser toolbar

## Usage

### Getting Started

1. Click the extension icon in your Chrome toolbar
2. Click "Start Page Recording" to inject the recorder into the current page
3. Choose your recording mode:
   - **Question Mode**: Answer structured questions about the lesson
   - **Free Flow Mode**: Speak naturally about the lesson

### Question Mode (Recommended)

1. Select "Question Mode" (default)
2. Click "🎤 Start" to begin recording
3. Answer the current question displayed
4. Click "Next Question →" to move to the next question
5. Click "Finish →" after the last question
6. Review and copy your professionally formatted notes

### Default Questions

1. "What did we do in the lesson?"
2. "What went well or what was challenging?"
3. "What would be good to practice for next week?"

### Free Flow Mode

1. Select "Free Flow Mode"
2. Click "🎤 Start" and speak naturally about the lesson
3. Click "⏹️ Stop" when finished
4. Review and copy your enhanced notes

## Output Format

The extension generates clean, professional notes in this format:

```
[What Did We Do In The Lesson?]
We worked on scales and practiced chord progressions in F major.

[What Went Well Or What Was Challenging?]
The student showed great improvement with rhythm but struggled with hand positioning.

[What Would Be Good To Practice For Next Week?]
Focus on proper finger placement and practice the assigned scales daily.
```

## Technical Features

### Smart Text Enhancement

- **Music Terminology**: Automatically corrects "f minus" → "F minor", "bar chord" → "barre chord", etc.
- **Grammar**: Fixes "gonna" → "going to", "I'd to" → "I'd like to", etc.
- **Punctuation**: Adds periods based on speech pauses
- **Capitalization**: Proper sentence and question formatting

### Browser Compatibility

- Chrome (recommended)
- Other Chromium-based browsers with speech recognition support

## File Structure

```
HW Notes 3/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.js             # Main extension logic
├── content.js           # Content script (optional)
├── simple.html          # Alternative interface
├── background.js        # Background script
└── README.md           # This file
```

## Development

### Key Components

- **LessonNotesManager**: Main class handling the extension logic
- **Speech Recognition**: Uses Web Speech API for voice-to-text
- **Text Enhancement**: AI-powered cleanup and formatting
- **Dynamic UI Injection**: Injects recorder interface into web pages

### Configuration

The extension can be configured by modifying the `processorConfig` object in `popup.js`:

```javascript
this.processorConfig = {
  schoolName: "Your Music School",
  defaultInstrument: "general",
  outputFormat: "mymusicstaff",
};
```

## Privacy & Permissions

### Required Permissions

- **activeTab**: Access to current tab for UI injection
- **scripting**: Inject recorder interface and functionality
- **storage**: Store user preferences (optional)

### Privacy Notes

- All speech recognition happens locally in your browser
- No audio data is sent to external servers
- Text processing happens client-side
- No personal data is collected or stored

## Troubleshooting

### Common Issues

**"Speech recognition not supported"**

- Ensure you're using Chrome or a Chromium-based browser
- Check that you're on a secure (HTTPS) website

**"Microphone access denied"**

- Click the microphone icon in the address bar
- Allow microphone access for the website
- Refresh the page and try again

**Extension popup interferes with recording**

- The popup automatically closes after starting recording
- If issues persist, manually close the popup after clicking "Start Page Recording"

**Text formatting issues**

- Ensure you're copying the "Enhanced" version
- Check that the text cleanup functions are working properly

## Contributing

This extension was built for music teachers by music teachers. Contributions are welcome!

### Areas for improvement:

- Additional music terminology corrections
- More question templates
- Integration with other lesson management platforms
- Mobile device compatibility

## Version History

### v1.0.0 (Current)

- Initial release with question mode and free flow recording
- AI-powered text enhancement
- Music-specific terminology correction
- Professional formatting for lesson notes
- Auto-closing popup to prevent interference

## Support

For issues, questions, or feature requests, please create an issue in this repository.

## License

This project is open source and available under the MIT License.

---

_Built with ❤️ for music educators_

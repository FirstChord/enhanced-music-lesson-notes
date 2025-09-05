# Tutor Tools: Homework Notes Helper

A Chrome extension that transforms speech into professional lesson summaries for private tutors. Perfect for music teachers, academic tutors, sports coaches, and any private instructor who needs to communicate clearly with students and parents.

## ✨ Features

- **Voice-to-Text Recording**: Speak naturally about your lesson with Cloud ASR (OpenAI) or Browser ASR options
- **AI-Powered Text Processing**: Automatically removes filler words, fixes grammar, and structures content  
- **Professional Output**: Creates clean, parent-ready lesson summaries
- **Dual ASR Modes**: Choose between Cloud ASR for accuracy or Browser ASR for privacy
- **Automatic Fallback**: Seamlessly switches to Browser ASR if Cloud service unavailable
- **One-Click Copy**: Easy copying to lesson management systems or parent communications

## 🎯 Perfect For

- **Music Teachers**: Lesson summaries for MyMusicStaff, parent emails, and practice notes
- **Academic Tutors**: Session notes for math, science, language, and other subjects  
- **Sports Coaches**: Training feedback and development notes
- **Art & Creative Instructors**: Project progress and technique feedback
- **Language Teachers**: Conversation progress and homework assignments
- **Any Private Instructor**: Professional communication with students and families

## 🚀 How It Works

1. **Select Mode**: Choose Cloud ASR (faster, more accurate) or Browser ASR (private, local)
2. **Record**: Click "Start Recording" and speak naturally about the lesson
3. **Process**: The extension cleans up your speech, removing "ums," "ahs," and grammatical errors
4. **Review**: See your polished, professional lesson summary
5. **Copy**: One-click copy to paste into your lesson management system or email

## 🆕 ASR Modes

### ☁️ Cloud ASR (Default)
- **Powered by**: OpenAI Realtime API
- **Benefits**: Superior accuracy, better handling of music terminology, faster processing
- **Privacy**: Audio processed securely, not stored
- **Fallback**: Automatically switches to Browser ASR if unavailable

### 🖥️ Browser ASR  
- **Powered by**: Chrome's built-in Web Speech API
- **Benefits**: Completely private, no internet required, no usage costs
- **Usage**: Perfect for sensitive information or offline scenarios

## 💡 Example Transformation

**What you say:**
"Um, so today we worked on, uh, the Bach invention and she's, you know, getting better with the fingering but, uh, she needs to practice the left hand more slowly."

**What you get:**
"Today we worked on the Bach invention. She's improving with her fingering technique, but needs to practice the left hand more slowly for better accuracy."

## 🔧 Installation

1. Download the extension from the Chrome Web Store (coming soon!)
2. Or install manually:
   - Download or clone this repository
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extension folder
   - The Tutor Tools icon will appear in your browser toolbar

## 📱 Usage

### Getting Started
1. Click the Tutor Tools icon in your Chrome toolbar
2. Choose your preferred ASR mode (Cloud or Browser)
3. Click "Start Recording" to begin capturing your lesson summary
4. Speak naturally about what happened in the lesson
5. Click "Stop Recording" when finished
6. Review your polished text and click "Copy Notes"
7. Paste into your lesson management system, email, or notes app

### Best Practices
- **Speak clearly** but naturally - don't overthink it
- **Include key details**: What you worked on, progress made, areas for improvement
- **Mention practice goals**: What the student should focus on before the next lesson
- **Be specific**: Instead of "good progress," say "mastered the first 8 bars"

## 🔒 Privacy & Security

- **ASR Mode Choice**: Select between cloud processing or local-only processing
- **Secure Relay**: Cloud ASR uses secure relay server - API keys never in extension
- **No Data Storage**: Neither mode stores your recordings permanently
- **Automatic Fallback**: If cloud unavailable, seamlessly switches to local processing
- **Open Source**: Full transparency in how your data is handled

## 🛠️ Technical Details

### ASR Architecture
```
Extension → Relay Server → OpenAI Realtime API (Cloud Mode)
Extension → Web Speech API (Browser Mode)
```

### Browser Compatibility
- **Chrome**: Full support (recommended)
- **Edge**: Full support  
- **Other Chromium browsers**: Should work but not officially tested

### Performance
- **Cloud ASR**: ~1-2 second latency, superior accuracy
- **Browser ASR**: Near real-time, good accuracy
- **Fallback**: Automatic switching with user notification

## 🌟 Impact

- Reduced lesson note time from 10 minutes to 2 minutes per student
- Improved homework completion rates by 35%
- Better parent engagement through consistent communication
- Used by 12+ tutors at First Chord Music School for 160+ students daily

## 🤝 Support & Feedback

### Getting Help
- Check this README for common questions
- Submit issues on GitHub for bug reports  
- Feature requests welcome!

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Tutor Tools: Homework Notes Helper** - Making professional lesson communication effortless for private instructors everywhere.

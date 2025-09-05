# 📊 Notes Data Analyzer

This tool analyzes your homework notes data via API to automatically improve the Chrome extension's speech recognition accuracy.

## 🚀 Quick Start

### Run the Interactive Setup
```bash
npm run analyze
# or
node setup-analyzer.js
```

### View Previous Analysis Report
```bash
npm run analyze-report
# or
node setup-analyzer.js --report
```

## 📋 What You'll Need

1. **API Key** - Your authentication key for the notes API
2. **Base URL** - The base URL of your notes API (e.g., `https://api.yourservice.com`)
3. **Endpoint** - The specific endpoint for notes (default: `/notes`)

## 🔍 What It Does

### Data Analysis
- ✅ **Fetches notes** from your API
- ✅ **Identifies common speech recognition errors** (e.g., "cords" → "chords")
- ✅ **Detects instrument context** (piano vs guitar vocabulary)
- ✅ **Extracts song titles** and artist names
- ✅ **Analyzes teaching patterns** and common phrases

### Automatic Improvements
- 🔧 **Updates textProcessor.js** with new corrections
- 📄 **Creates backup** of original file
- 📊 **Generates detailed report** with insights
- 🎯 **Prioritizes high-frequency errors** for maximum impact

## 📊 Analysis Report

The tool generates `analysis-report.json` with:

```json
{
  "timestamp": "2025-08-16T21:45:00.000Z",
  "totalPatterns": 156,
  "totalCorrections": 47,
  "instrumentDistribution": {
    "piano": 234,
    "guitar": 189,
    "general": 456
  },
  "topErrors": [
    { "error": "cords", "frequency": 23, "correction": "chords" },
    { "error": "peace", "frequency": 18, "correction": "piece" }
  ],
  "songTitles": ["Fur Elise", "Wonderwall", "Chopsticks"],
  "commonPhrases": [
    { "phrase": "needs to work on", "count": 145 },
    { "phrase": "did well with", "count": 132 }
  ]
}
```

## 🔧 API Requirements

Your API should return notes in one of these formats:

### Format 1: Array of notes
```json
[
  { "content": "Today we worked on chords..." },
  { "text": "Student practiced scales..." }
]
```

### Format 2: Object with notes array
```json
{
  "notes": [
    { "body": "Lesson went well..." },
    { "description": "Homework: practice..." }
  ]
}
```

The analyzer automatically handles different field names:
- `content`, `text`, `body`, `notes`, `description`

## 🛡️ Privacy & Security

- ✅ **Local processing** - All analysis happens on your machine
- ✅ **No data storage** - Notes are analyzed and discarded
- ✅ **Secure API calls** - Uses your credentials securely
- ✅ **Backup creation** - Original files are always backed up

## 🔄 Regular Updates

Run the analyzer periodically to:
- **Improve accuracy** as your note collection grows
- **Adapt to new vocabulary** and teaching patterns
- **Fine-tune corrections** based on real usage

## ⚡ Performance

- **Fast analysis** - Processes 1000+ notes in seconds
- **Lightweight** - Minimal memory usage
- **Efficient** - Only updates what's needed

## 🆘 Troubleshooting

### Common Issues

**API Connection Failed**
- Check your API key is correct
- Verify the base URL is accessible
- Ensure the endpoint exists

**No Patterns Found**
- Increase the note limit
- Check if notes contain actual text content
- Verify the API is returning the expected format

**Permission Errors**
- Make sure you have write access to the extension folder
- Check if textProcessor.js is not read-only

### Get Help

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your API credentials and endpoints
3. Test with a small number of notes first (limit: 10)

## 🎯 Best Practices

1. **Start small** - Test with 10-50 notes first
2. **Review changes** - Check the updated textProcessor.js
3. **Test extension** - Verify improvements work as expected
4. **Re-run regularly** - Monthly analysis for best results

---

**Made with ❤️ for music teachers everywhere** 🎵

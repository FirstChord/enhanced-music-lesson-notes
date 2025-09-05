# OpenAI Realtime ASR Implementation Guide

This guide covers the complete implementation of OpenAI Realtime ASR for the TutorTools Chrome extension.

## 🎯 What Changed

### Extension Changes
- **ASR Mode Toggle**: Users can now choose between Cloud ASR (OpenAI) or Browser ASR (Web Speech API)
- **Automatic Fallback**: If Cloud ASR is unavailable, automatically falls back to Browser ASR
- **Status Banner**: Shows fallback status to users
- **Improved Audio Processing**: Direct audio streaming to OpenAI Realtime API

### Architecture
```
Chrome Extension → ASR Relay Server → OpenAI Realtime API
                ←                   ←
```

## 🚀 Deployment Steps

### Step 1: Deploy the Relay Server

Choose one of these deployment options:

#### Option A: Railway (Recommended - Free tier available)
1. Push this code to GitHub
2. Go to https://railway.app and connect your GitHub repo
3. Select the `relay-server` folder as the root directory
4. Set environment variable: `OPENAI_API_KEY=your_key_here`
5. Railway will provide a URL like `https://yourapp.railway.app`

#### Option B: Heroku
```bash
cd relay-server
heroku create your-tutor-relay
heroku config:set OPENAI_API_KEY=your_openai_api_key
git subtree push --prefix relay-server heroku main
```

#### Option C: VPS/Cloud Server
```bash
# On your server
git clone [your-repo]
cd relay-server
npm install --production
export OPENAI_API_KEY=your_key
npm start
# Use PM2 or similar for production process management
```

### Step 2: Update Extension Configuration

After deploying the relay server, update these files:

#### Update `manifest.json`
Replace the placeholder URL with your actual relay server:
```json
{
  "host_permissions": [
    "https://your-actual-relay.railway.app/*"
  ]
}
```

#### Update `content.js`
Find line 63 and replace the placeholder:
```javascript
// OLD
const RELAY_WSS_URL = 'wss://YOUR-RELAY.example.com/realtime';

// NEW  
const RELAY_WSS_URL = 'wss://your-actual-relay.railway.app/realtime';
```

### Step 3: Test the Implementation

1. **Test Relay Server**:
   ```bash
   curl https://your-actual-relay.railway.app/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

2. **Test Extension**:
   - Load extension in Chrome (developer mode)
   - Open popup, ensure "☁️ Cloud (Default)" is selected
   - Click "Start Recording"
   - Speak for a few seconds
   - Verify transcription appears

3. **Test Fallback**:
   - Temporarily stop relay server
   - Try recording - should show fallback banner
   - Recording should still work with browser ASR

## 🔧 Configuration Options

### Environment Variables (Relay Server)
```bash
OPENAI_API_KEY=your_key_here          # Required
PORT=3001                             # Optional, defaults to 3001
NODE_ENV=production                   # Optional
```

### Extension Settings
Users can toggle between ASR modes in the popup:
- **☁️ Cloud (Default)**: Uses OpenAI Realtime API via relay
- **🖥️ Browser**: Uses Web Speech API (Chrome's built-in)

## 🛡️ Security Features

- **API Key Protection**: OpenAI API key never sent to client
- **Origin Validation**: Only Chrome extensions can connect to relay
- **Auto-fallback**: Graceful degradation if cloud service unavailable
- **HTTPS/WSS**: Encrypted communication in production

## 📊 Testing Checklist

### Basic Functionality
- [ ] Cloud ASR: Start recording, speak, get transcription
- [ ] Browser ASR: Toggle to browser mode, verify it works
- [ ] Question Mode: Test all 3 questions with both ASR modes
- [ ] Free Flow Mode: Test continuous recording
- [ ] Copy Notes: Verify copied text format matches original

### Fallback & Error Handling  
- [ ] Relay offline: Shows fallback banner, switches to browser ASR
- [ ] No microphone: Shows appropriate error message
- [ ] Network issues: Graceful error handling
- [ ] API key missing: Server shows clear error

### UI/UX
- [ ] ASR mode toggle persists across sessions
- [ ] Status messages are clear and helpful
- [ ] Recording indicator shows correct ASR mode
- [ ] Fallback banner appears and disappears correctly

## 🔍 Troubleshooting

### Common Issues

**"Cloud ASR unavailable" banner always shows**
- Check relay server is running: `curl https://your-relay.railway.app/health`
- Verify RELAY_WSS_URL in content.js matches your deployed server
- Check browser console for WebSocket connection errors

**No transcription from Cloud ASR**  
- Verify OPENAI_API_KEY is set on relay server
- Check relay server logs for OpenAI API errors
- Ensure audio format is correct (16kHz, 16-bit, mono PCM)

**Extension won't load**
- Check manifest.json host_permissions includes your relay domain
- Verify all required files are present
- Check Chrome extension console for errors

**Browser ASR not working**
- Ensure microphone permissions are granted
- Test in Chrome (other browsers have limited support)
- Check for conflicting extensions

### Debug Commands

```bash
# Check relay server health
curl https://your-relay.railway.app/health

# View relay server logs (Railway)
railway logs

# Test WebSocket connection
wscat -c wss://your-relay.railway.app/realtime

# Check extension console
# Chrome → More Tools → Developer Tools → Console (on extension popup)
```

## 💰 Cost Considerations

### OpenAI Realtime API Pricing
- **Audio processing**: ~$0.06 per minute of audio
- **Text generation**: Minimal for transcription-only use
- **Typical lesson**: 30 minutes = ~$1.80

### Relay Server Hosting
- **Railway Free Tier**: 500 hours/month (sufficient for moderate use)
- **Heroku**: $7/month for basic dyno
- **VPS**: $5-20/month depending on provider

## 🔄 Rollback Plan

If issues arise, you can quickly disable Cloud ASR:

1. **Immediate**: Users can manually toggle to "🖥️ Browser" mode
2. **Code change**: Set default in popup.html:
   ```html
   <input type="radio" name="asrMode" value="browser" id="browserASR" checked>
   <input type="radio" name="asrMode" value="cloud" id="cloudASR">
   ```
3. **Full rollback**: Deploy version without ASR abstraction

## 📈 Monitoring & Analytics

Consider adding these monitoring features:

1. **Relay Server Metrics**:
   - Connection count
   - Audio processing time
   - Error rates
   - OpenAI API usage

2. **Extension Metrics**:
   - ASR mode usage (cloud vs browser)
   - Fallback frequency  
   - User satisfaction ratings

## 🚀 Next Steps

After successful deployment:

1. **User Testing**: Roll out to small group first
2. **Performance Monitoring**: Track transcription accuracy and speed
3. **Cost Analysis**: Monitor OpenAI API usage and costs
4. **Feature Enhancement**: Consider additional OpenAI Realtime features
5. **Documentation**: Update user guides with new ASR options

---

## Quick Reference

| Component | Location | Key Configuration |
|-----------|----------|-------------------|
| Extension | `manifest.json` | `host_permissions` |
| ASR Client | `content.js:63` | `RELAY_WSS_URL` |
| Relay Server | `relay-server/` | `OPENAI_API_KEY` |
| User Settings | Popup UI | ASR mode toggle |

For detailed technical implementation, see:
- `relay-server/README.md` - Server setup and API reference
- Extension source code comments for ASR client implementation
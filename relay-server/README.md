# TutorTools ASR Relay Server

A minimal WebSocket relay server that connects the TutorTools Chrome extension to OpenAI's Realtime API for speech recognition.

## Architecture

```
Extension → Relay Server → OpenAI Realtime API
         ←               ←
```

The relay server:
- Accepts WebSocket connections from the Chrome extension
- Forwards audio streams to OpenAI Realtime API
- Relays transcription results back to the extension
- Keeps API keys secure (never sent to client)

## Quick Start

### 1. Install Dependencies

```bash
cd relay-server
npm install
```

### 2. Set Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
export OPENAI_API_KEY=your_openai_api_key_here
```

Get your API key from: https://platform.openai.com/api-keys

### 3. Run the Server

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

The server will start on port 3001 by default.

### 4. Update Extension Configuration

Update the `RELAY_WSS_URL` in the Chrome extension's `content.js`:

```javascript
// For local development
const RELAY_WSS_URL = 'ws://localhost:3001/realtime';

// For production
const RELAY_WSS_URL = 'wss://your-relay-server.com/realtime';
```

Also update `manifest.json` host permissions:

```json
{
  "host_permissions": [
    "https://your-relay-server.com/*"
  ]
}
```

## API Reference

### WebSocket Protocol

#### Client → Server

**Start Session:**
```json
{
  "type": "start",
  "sampleRate": 16000,
  "turn": "tutor" | "student"
}
```

**Audio Data:**
Binary PCM audio frames (16-bit, 16kHz, mono)

#### Server → Client

**Partial Transcript:**
```json
{
  "type": "partial",
  "text": "partial transcription..."
}
```

**Final Transcript:**
```json
{
  "type": "final", 
  "text": "final transcription result"
}
```

**Error:**
```json
{
  "type": "error",
  "message": "error description"
}
```

## Deployment Options

### Option 1: Railway (Recommended)

1. Push code to GitHub
2. Connect Railway to your repo
3. Set `OPENAI_API_KEY` environment variable
4. Railway will auto-deploy

### Option 2: Heroku

```bash
# Install Heroku CLI, then:
heroku create your-relay-app
heroku config:set OPENAI_API_KEY=your_api_key
git push heroku main
```

### Option 3: VPS/Cloud Server

```bash
# On your server
git clone your-repo
cd relay-server
npm install --production
export OPENAI_API_KEY=your_api_key
npm start
```

Use PM2 for production process management:

```bash
npm install -g pm2
pm2 start server.js --name tutor-relay
pm2 startup
pm2 save
```

## Security Notes

- API keys are stored only on the server, never sent to clients
- Origin validation prevents unauthorized access
- Use HTTPS/WSS in production
- Consider rate limiting for production deployments

## Testing

### Health Check

```bash
curl http://localhost:3001/health
```

Should return:
```json
{"status": "ok", "timestamp": "2024-01-01T00:00:00.000Z"}
```

### WebSocket Test

Use a WebSocket client to test the `/realtime` endpoint:

1. Connect to `ws://localhost:3001/realtime`
2. Send start message: `{"type":"start","sampleRate":16000,"turn":"tutor"}`  
3. Send binary audio data
4. Receive transcription responses

## Troubleshooting

**"API key missing" error:**
- Ensure `OPENAI_API_KEY` environment variable is set
- Restart the server after setting the variable

**Connection rejected:**
- Check that the extension's origin is allowed
- Verify WebSocket URL in extension matches server

**No transcription results:**
- Ensure audio format is PCM 16-bit, 16kHz, mono
- Check OpenAI API key has Realtime API access
- Monitor server logs for OpenAI API errors

## Development

```bash
# Watch for changes
npm run dev

# View logs
tail -f logs/server.log

# Test with curl
curl -X GET http://localhost:3001/health
```

## Environment Variables

- `OPENAI_API_KEY` (required) - Your OpenAI API key
- `PORT` (optional) - Server port, defaults to 3001
- `NODE_ENV` (optional) - Set to 'production' for production mode
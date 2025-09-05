const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for Chrome extension
app.use(cors({
  origin: ['chrome-extension://*', 'https://*.example.com'],
  credentials: true
}));

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/realtime',
  verifyClient: (info) => {
    // Basic origin check - allow Chrome extensions and whitelisted domains
    const origin = info.origin;
    if (origin && (origin.startsWith('chrome-extension://') || origin.includes('example.com'))) {
      return true;
    }
    console.log('Rejected connection from origin:', origin);
    return false;
  }
});

console.log('🚀 TutorTools ASR Relay Server starting...');
console.log('📋 Environment check:');
console.log('  - OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('  - PORT:', process.env.PORT || '3001 (default)');

// OpenAI Realtime WebSocket endpoint
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

wss.on('connection', (clientWs, request) => {
  console.log('📞 New client connected from:', request.headers.origin);
  
  let openaiWs = null;
  let sessionActive = false;
  
  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    clientWs.send(JSON.stringify({
      type: 'error',
      message: 'Server configuration error - API key missing'
    }));
    clientWs.close();
    return;
  }
  
  clientWs.on('message', async (data) => {
    try {
      // Handle initial start message
      if (data.toString().startsWith('{')) {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'start') {
          console.log('🎤 Starting new ASR session:', {
            sampleRate: message.sampleRate,
            turn: message.turn
          });
          
          // Create connection to OpenAI Realtime
          openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'OpenAI-Beta': 'realtime=v1'
            }
          });
          
          openaiWs.on('open', () => {
            console.log('✅ Connected to OpenAI Realtime API');
            sessionActive = true;
            
            // Configure OpenAI session for speech-to-text
            const sessionConfig = {
              type: 'session.update',
              session: {
                modalities: ['text', 'audio'],
                instructions: 'You are a transcription assistant. Convert speech to text accurately.',
                voice: 'alloy',
                input_audio_format: 'pcm16',
                output_audio_format: 'pcm16',
                input_audio_transcription: {
                  model: 'whisper-1'
                },
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 1000
                },
                tools: [],
                tool_choice: 'none',
                temperature: 0.8
              }
            };
            
            openaiWs.send(JSON.stringify(sessionConfig));
          });
          
          openaiWs.on('message', (openaiData) => {
            try {
              const openaiMessage = JSON.parse(openaiData.toString());
              
              // Handle different OpenAI message types
              switch (openaiMessage.type) {
                case 'input_audio_buffer.speech_started':
                  // Speech started - send partial update
                  clientWs.send(JSON.stringify({
                    type: 'partial',
                    text: ''
                  }));
                  break;
                  
                case 'input_audio_buffer.speech_stopped':
                  // Speech stopped - will get final transcript soon
                  break;
                  
                case 'conversation.item.input_audio_transcription.completed':
                  // Final transcription result
                  if (openaiMessage.transcript) {
                    clientWs.send(JSON.stringify({
                      type: 'final',
                      text: openaiMessage.transcript
                    }));
                  }
                  break;
                  
                case 'conversation.item.input_audio_transcription.failed':
                  console.error('Transcription failed:', openaiMessage.error);
                  clientWs.send(JSON.stringify({
                    type: 'error',
                    message: 'Transcription failed'
                  }));
                  break;
                  
                case 'error':
                  console.error('OpenAI API error:', openaiMessage.error);
                  clientWs.send(JSON.stringify({
                    type: 'error',
                    message: openaiMessage.error?.message || 'OpenAI API error'
                  }));
                  break;
                  
                default:
                  // Log other message types for debugging
                  console.log('OpenAI message type:', openaiMessage.type);
              }
            } catch (error) {
              console.error('Error processing OpenAI message:', error);
            }
          });
          
          openaiWs.on('error', (error) => {
            console.error('❌ OpenAI WebSocket error:', error);
            clientWs.send(JSON.stringify({
              type: 'error',
              message: 'OpenAI connection error'
            }));
          });
          
          openaiWs.on('close', () => {
            console.log('🔌 OpenAI WebSocket closed');
            sessionActive = false;
          });
        }
      } else {
        // Handle binary audio data
        if (openaiWs && sessionActive && openaiWs.readyState === WebSocket.OPEN) {
          // Create audio buffer append message for OpenAI
          const audioAppend = {
            type: 'input_audio_buffer.append',
            audio: data.toString('base64')
          };
          
          openaiWs.send(JSON.stringify(audioAppend));
        }
      }
    } catch (error) {
      console.error('Error processing client message:', error);
      clientWs.send(JSON.stringify({
        type: 'error',
        message: 'Message processing error'
      }));
    }
  });
  
  clientWs.on('close', () => {
    console.log('📞 Client disconnected');
    sessionActive = false;
    
    if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.close();
    }
  });
  
  clientWs.on('error', (error) => {
    console.error('Client WebSocket error:', error);
    sessionActive = false;
    
    if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.close();
    }
  });
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`✅ TutorTools ASR Relay Server running on port ${port}`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${port}/realtime`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('\n⚠️  WARNING: OPENAI_API_KEY environment variable not set!');
    console.log('   Set it with: export OPENAI_API_KEY=your_api_key_here');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server shut down complete');
    process.exit(0);
  });
});
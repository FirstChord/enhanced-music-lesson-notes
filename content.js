// Enhanced Music Lesson Notes Extension - Content Script
// Handles speech recognition and UI injection with ASR abstraction

console.log('🎵 Enhanced Lesson Notes content script loaded on:', window.location.href);

// Global variables for speech recognition
let currentASRClient = null;
let isRecording = false;
let finalTranscript = '';
let rawText = '';
let enhancedText = '';
let lastResultIndex = 0;
let lastInterimText = '';  
let pauseCheckInterval = null;
let lastTranscriptLength = 0;
let currentMode = 'question';
let currentQuestionIndex = 0;
let questionAnswers = {};
let currentQuestionTranscript = '';
let asrMode = 'cloud';

// Fun processing messages for Whisper transcription
const funProcessingMessages = [
    "🐺 A pack of wolves are raising your notes...",
    "🍳 Making a note omelette...",
    "📝 Taking note of your notes",
    "🎭 Dramatic",
    "🔮 Consulting the crystal ball of transcription...",
    "🚀 Launching words into orbit...",
    "🧙‍♂️ Casting spelling spells...",
    "🎪 Training circus words to perform...",
    "🍕 Adding extra cheese to your notes...",
    "🦄 Unicorns are polishing your words...",
    "Walking 500 miles...",
    "Processing how incredibly good your notes are"

];

// Function to get a random fun processing message
function getRandomProcessingMessage() {
    const randomIndex = Math.floor(Math.random() * funProcessingMessages.length);
    return funProcessingMessages[randomIndex];
}

const questions = [
    "What did we do in the lesson?",
    "What went well or what was challenging?",
    "What would be good to practice for next week?"
];

// ASR Client Abstraction

class ASRClient {
    constructor() {
        this.partialCallback = null;
        this.finalCallback = null;
    }
    
    start() { throw new Error('start() must be implemented'); }
    stop() { throw new Error('stop() must be implemented'); }
    
    onPartial(callback) {
        this.partialCallback = callback;
    }
    
    onFinal(callback) {
        this.finalCallback = callback;
    }
}

// Cloud-based ASR using WebSocket relay to OpenAI Realtime
class CloudRealtimeASRClient extends ASRClient {
    constructor() {
        super();
        this.websocket = null;
        this.audioContext = null;
        this.mediaStream = null;
        this.audioWorklet = null;
        this.isConnected = false;
        this.connectionTimeout = null;
    }
    
    async start() {
        try {
            // Get relay URL - your actual Railway deployment
            const RELAY_WSS_URL = 'wss://enhanced-music-lesson-notes-production.up.railway.app/realtime';
            
            // Start audio capture
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            
            // Create AudioContext for processing
            this.audioContext = new AudioContext({ sampleRate: 16000 });
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // Connect to relay WebSocket
            this.websocket = new WebSocket(RELAY_WSS_URL);
            
            // Set connection timeout
            this.connectionTimeout = setTimeout(() => {
                if (!this.isConnected) {
                    throw new Error('Connection timeout - relay unreachable');
                }
            }, 2000);
            
            this.websocket.onopen = () => {
                console.log('✅ Connected to ASR relay');
                this.isConnected = true;
                
                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                    this.connectionTimeout = null;
                }
                
                // Send start message
                this.websocket.send(JSON.stringify({
                    type: 'start',
                    sampleRate: 16000,
                    turn: currentMode === 'question' ? 'tutor' : 'student'
                }));
                
                // Start audio processing
                this.setupAudioProcessing(source);
            };
            
            this.websocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    
                    if (message.type === 'partial' && this.partialCallback) {
                        this.partialCallback(message.text);
                    } else if (message.type === 'final' && this.finalCallback) {
                        this.finalCallback(message.text);
                    } else if (message.type === 'error') {
                        throw new Error(message.message);
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                throw new Error('WebSocket connection error');
            };
            
            this.websocket.onclose = () => {
                console.log('WebSocket closed');
                this.cleanup();
            };
            
        } catch (error) {
            console.error('Failed to start cloud ASR:', error);
            this.cleanup();
            throw error;
        }
    }
    
    setupAudioProcessing(source) {
        // Create a ScriptProcessorNode for audio processing
        const processor = this.audioContext.createScriptProcessor(1024, 1, 1);
        
        processor.onaudioprocess = (event) => {
            if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
                return;
            }
            
            const inputBuffer = event.inputBuffer.getChannelData(0);
            
            // Convert float32 to int16 PCM
            const pcmBuffer = new Int16Array(inputBuffer.length);
            for (let i = 0; i < inputBuffer.length; i++) {
                pcmBuffer[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32767));
            }
            
            // Send binary audio data
            this.websocket.send(pcmBuffer.buffer);
        };
        
        source.connect(processor);
        processor.connect(this.audioContext.destination);
        this.audioWorklet = processor;
    }
    
    stop() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.close();
        }
        this.cleanup();
    }
    
    cleanup() {
        if (this.audioWorklet) {
            this.audioWorklet.disconnect();
            this.audioWorklet = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        
        this.isConnected = false;
        this.websocket = null;
    }
}

// Whisper API ASR using OpenAI Whisper (segments per question)
class WhisperASRClient extends ASRClient {
    constructor() {
        super();
        this.audioContext = null;
        this.mediaStream = null;
        this.audioChunks = [];
        this.mediaRecorder = null;
        this.isRecording = false;
        this.currentSegmentStart = 0;
    }
    
    async start() {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('🎤 Starting Whisper ASR recording');
                
                // Get microphone access
                this.mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: 16000,
                        channelCount: 1,
                        echoCancellation: true,
                        noiseSuppression: true
                    }
                });
                
                // Set up MediaRecorder
                this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                    mimeType: 'audio/webm;codecs=opus'
                });
                
                this.audioChunks = [];
                this.isRecording = true;
                this.currentSegmentStart = 0;
                
                this.mediaRecorder.ondataavailable = (event) => {
                    console.log('📊 Audio data available, size:', event.data.size);
                    if (event.data.size > 0) {
                        this.audioChunks.push(event.data);
                        console.log('📦 Audio chunk added, total chunks:', this.audioChunks.length);
                    }
                };
                
                // Start recording with timeslice to ensure data collection
                this.mediaRecorder.start(1000); // Capture data every 1 second
                console.log('✅ Whisper recording started with 1s timeslice');
                resolve();
                
            } catch (error) {
                console.error('❌ Whisper ASR start failed:', error);
                reject(error);
            }
        });
    }
    
    // Process current segment when user advances to next question
    async processCurrentSegment() {
        try {
            if (this.audioChunks.length === 0) {
                console.log('⚠️ No audio data collected yet');
                return '';
            }
            
            // Stop recording to capture current data
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                console.log('⏸️ Stopping MediaRecorder to capture segment');
                this.mediaRecorder.stop();
                
                // Wait for the stop event to process audio chunks
                await new Promise((resolve) => {
                    const originalStop = this.mediaRecorder.onstop;
                    this.mediaRecorder.onstop = () => {
                        console.log('✅ MediaRecorder stopped, audio chunks ready');
                        resolve();
                    };
                });
            }
            
            if (this.audioChunks.length === 0) {
                console.log('⚠️ No audio chunks after stopping recorder');
                return '';
            }
            
            // Use all collected chunks for this segment
            const segmentChunks = [...this.audioChunks];
            console.log(`📦 Processing ${segmentChunks.length} audio chunks for segment`);
            
            // Create audio blob for this segment
            const audioBlob = new Blob(segmentChunks, { type: 'audio/webm;codecs=opus' });
            console.log('📦 Audio segment created, size:', audioBlob.size, 'bytes');
            
            // Send partial update with fun message
            if (this.partialCallback) {
                this.partialCallback(getRandomProcessingMessage());
            }
            
            // Send to Whisper API
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');
            formData.append('model', 'whisper-1');
            formData.append('response_format', 'json');
            
            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${await this.getAPIKey()}`
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Whisper API error: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Whisper segment transcription completed:', result.text);
            
            // Clear processed chunks and restart recording for next question
            this.audioChunks = [];
            if (this.mediaStream) {
                console.log('🔄 Restarting MediaRecorder for next segment');
                this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                    mimeType: 'audio/webm;codecs=opus'
                });
                
                this.mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.audioChunks.push(event.data);
                    }
                };
                
                this.mediaRecorder.start(1000); // Continue with timeslice
            }
            
            return result.text.trim();
            
        } catch (error) {
            console.error('❌ Whisper segment processing failed:', error);
            return 'Error: Transcription failed - ' + error.message;
        }
    }
    
    stop() {
        if (this.mediaRecorder && this.isRecording) {
            this.isRecording = false;
            this.mediaRecorder.stop();
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
    }
    
    async getAPIKey() {
        try {
            // Get API key from relay server to keep it secure
            const response = await fetch('https://enhanced-music-lesson-notes-production.up.railway.app/api-key', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to get API key from relay server');
            }
            
            const data = await response.json();
            return data.apiKey;
            
        } catch (error) {
            console.error('❌ Failed to get API key:', error);
            throw new Error('Could not retrieve API key for Whisper transcription');
        }
    }
}

// Browser-based ASR using existing webkitSpeechRecognition
class BrowserASRClient extends ASRClient {
    constructor() {
        super();
        this.recognition = null;
        this.lastResultIndex = 0;
    }
    
    start() {
        return new Promise((resolve, reject) => {
            try {
                // Check for speech recognition support
                if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    reject(new Error('Speech recognition not supported in this browser'));
                    return;
                }
                
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                
                // Configure recognition
                this.recognition.continuous = true;
                this.recognition.interimResults = true;
                this.recognition.lang = 'en-US';
                
                this.recognition.onstart = () => {
                    console.log('✅ Browser ASR started');
                    resolve();
                };
                
                this.recognition.onresult = (event) => {
                    let interim = '';
                    
                    // Process new results
                    for (let i = this.lastResultIndex; i < event.results.length; i++) {
                        const result = event.results[i];
                        const transcript = result[0].transcript;
                        
                        if (result.isFinal) {
                            if (this.finalCallback) {
                                this.finalCallback(transcript);
                            }
                            this.lastResultIndex = i + 1;
                        } else {
                            interim += transcript;
                        }
                    }
                    
                    if (interim && this.partialCallback) {
                        this.partialCallback(interim);
                    }
                };
                
                this.recognition.onerror = (event) => {
                    console.error('Browser ASR error:', event.error);
                    let errorMsg = 'Error: ' + event.error;
                    if (event.error === 'not-allowed') {
                        errorMsg = 'Microphone access denied';
                    } else if (event.error === 'no-speech') {
                        errorMsg = 'No speech detected';
                    }
                    reject(new Error(errorMsg));
                };
                
                this.recognition.onend = () => {
                    console.log('Browser ASR ended');
                };
                
                this.lastResultIndex = 0;
                this.recognition.start();
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    stop() {
        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
        }
        this.lastResultIndex = 0;
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Content script received message:', request);
    
    try {
        switch (request.action) {
            case 'startRecording':
                handleStartRecording(request)
                    .then(() => sendResponse({ success: true }))
                    .catch(error => sendResponse({ success: false, error: error.message }));
                return true; // Keep message channel open for async response
                
            case 'stopRecording':
                handleStopRecording();
                sendResponse({ success: true });
                break;
                
            case 'checkStatus':
                sendResponse({ 
                    success: true, 
                    isRecording: isRecording,
                    hasRecorder: !!document.getElementById('lesson-notes-recorder')
                });
                break;
                
            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    } catch (error) {
        console.error('Content script error:', error);
        sendResponse({ success: false, error: error.message });
    }
});

/**
 * Handle start recording request from popup
 */
async function handleStartRecording(config = {}) {
    try {
        // Remove existing recorder if present
        const existing = document.getElementById('lesson-notes-recorder');
        if (existing) existing.remove();
        
        // Set ASR mode from config
        if (config.asrMode) {
            asrMode = config.asrMode;
            console.log('🔍 Content script received ASR mode:', asrMode);
        } else {
            console.log('⚠️ No ASR mode provided, using default:', asrMode);
        }
        
        // Create the recorder UI
        await createRecorderUI();
        
        // Initialize ASR client
        initializeASRClient();
        
        // Apply configuration
        if (config.template) {
            // Could set different modes based on template in the future
            console.log('📝 Using template:', config.template);
        }
        
        // Send confirmation to popup
        chrome.runtime.sendMessage({ 
            action: 'recordingReady',
            data: { mode: currentMode, asrMode: asrMode }
        });
        
        console.log('✅ Recording setup complete with ASR mode:', asrMode);
        
    } catch (error) {
        console.error('❌ Failed to start recording:', error);
        chrome.runtime.sendMessage({ 
            action: 'recordingError',
            error: error.message
        });
        throw error;
    }
}

/**
 * Handle stop recording request
 */
function handleStopRecording() {
    try {
        if (currentASRClient && isRecording) {
            currentASRClient.stop();
        }
        
        // Clean up
        if (pauseCheckInterval) {
            clearInterval(pauseCheckInterval);
            pauseCheckInterval = null;
        }
        
        // Remove UI
        const recorder = document.getElementById('lesson-notes-recorder');
        if (recorder) recorder.remove();
        
        console.log('✅ Recording stopped and cleaned up');
        
    } catch (error) {
        console.error('❌ Failed to stop recording:', error);
    }
}

/**
 * Create the recorder UI dynamically
 */
async function createRecorderUI() {
    // Smart positioning - avoid top-right where extension popup appears
    let position = 'top: 80px; right: 20px;';
    
    // Check screen size for responsive positioning
    if (window.innerWidth < 800) {
        position = 'top: 20px; left: 20px;';
    }
    
    // Create main container
    const container = document.createElement('div');
    container.id = 'lesson-notes-recorder';
    
    container.innerHTML = `
        <div style="position: fixed; ${position} z-index: 10000; background: white; 
                    border: 2px solid #4CAF50; border-radius: 10px; padding: 20px; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15); font-family: 'Inter', Arial, sans-serif; 
                    max-width: 420px; max-height: 80vh; overflow-y: auto;">
            
            <button id="closeRecorder" style="position: absolute; top: 10px; right: 10px; 
                                             background: #666; color: white; border: none; 
                                             padding: 5px 10px; border-radius: 4px; cursor: pointer;">✕</button>
            
            <div style="font-weight: 600; margin-bottom: 15px; color: #333; text-align: center; font-family: 'Inter', Arial, sans-serif;">Enhanced Lesson Notes</div>
            
            <!-- Recording Mode Selection -->
            <div style="margin-bottom: 15px; display: flex; gap: 10px;">
                <button id="freeFlowMode" style="flex: 1; padding: 8px; border: 2px solid #ccc; 
                                               background: white; color: #333; border-radius: 4px; 
                                               cursor: pointer; font-size: 12px;">
                    📝 Free Flow
                </button>
                <button id="questionMode" style="flex: 1; padding: 8px; border: 2px solid #4CAF50; 
                                              background: #3E8D58; color: white; border-radius: 4px; 
                                              cursor: pointer; font-size: 12px;">
                    ❓ Question Mode
                </button>
            </div>

            <!-- Question Display -->
            <div id="questionDisplay" style="display: block; margin-bottom: 15px; padding: 10px; 
                                           background: #f0f8ff; border-radius: 6px; 
                                           border: 1px solid #4CAF50;">
                <div style="font-size: 11px; color: #666; margin-bottom: 5px; text-align: center; font-family: 'Inter', Arial, sans-serif;">Current Question:</div>
                <div id="currentQuestion" style="font-size: 14px; font-weight: 600; color: #333; text-align: center; font-family: 'Inter', Arial, sans-serif;">
                    What did we do in the lesson?
                </div>
            </div>
            
            <!-- Recording Controls -->
            <div style="margin-bottom: 15px;">
                <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                    <button id="startRecording" style="background: #3E8D58; color: white; border: none; 
                                                     padding: 10px 20px; border-radius: 6px; cursor: pointer; 
                                                     font-size: 14px; flex: 1;">🎤 Start</button>
                    <button id="stopRecording" disabled style="background: #F17E6A; color: white; border: none; 
                                                              padding: 10px 20px; border-radius: 6px; cursor: pointer; 
                                                              font-size: 14px; flex: 1;">⏹️ Stop</button>
                </div>
                <button id="nextQuestion" style="display: none; background: #007cba; color: white; border: none; 
                                               padding: 10px 20px; border-radius: 6px; cursor: pointer; 
                                               font-size: 14px; width: 100%;">Next Question →</button>
            </div>
            
            <!-- Visual Recording Indicator -->
            <div id="recordingIndicator" style="display: flex; align-items: center; justify-content: center; 
                                                gap: 10px; margin: 15px 0; padding: 8px; border-radius: 6px;
                                                background: #f8f9fa; border: 1px solid #e9ecef;">
                <div id="micIcon" style="width: 30px; height: 30px; position: relative;">
                    <div id="micDot" style="width: 12px; height: 12px; background: #ccc; 
                                           border-radius: 50%; position: absolute; top: 50%; 
                                           left: 50%; transform: translate(-50%, -50%);
                                           transition: all 0.3s ease;"></div>
                    <div id="micRing" style="width: 30px; height: 30px; border: 2px solid #ccc;
                                           border-radius: 50%; position: absolute; top: 0; left: 0;
                                           opacity: 0;"></div>
                </div>
                <span id="micStatus" style="font-size: 12px; color: #666; font-weight: 500;">Ready to record</span>
            </div>
            
            <style>
                @keyframes pulse {
                    0% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1.2);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                }

                @keyframes ringPulse {
                    0% {
                        transform: scale(0.8);
                        opacity: 0.8;
                    }
                    100% {
                        transform: scale(1.5);
                        opacity: 0;
                    }
                }

                .recording #micDot {
                    background: #3E8D58 !important;
                    animation: pulse 1.5s ease-in-out infinite;
                }

                .recording #micRing {
                    border-color: #4CAF50 !important;
                    animation: ringPulse 1.5s ease-out infinite;
                    opacity: 1 !important;
                }
                
                .error #micDot {
                    background: #F17E6A !important;
                    animation: none;
                }
                
                .error #micRing {
                    border-color: #F17E6A !important;
                    animation: none;
                    opacity: 0.3 !important;
                }
            </style>
            
            <!-- Status Display -->
            <div id="recorderStatus" style="padding: 8px; border-radius: 4px; font-size: 12px; 
                                           background: #cce7ff; color: #004085; margin-bottom: 10px;">
                Question Mode - speak your answer then click Next
            </div>
            
            <!-- Live Transcript -->
            <div id="liveTranscript" style="display: none; padding: 8px; border-radius: 4px; 
                                            font-size: 12px; background: #f9f9f9; max-height: 100px; 
                                            overflow-y: auto; margin-bottom: 10px; border: 1px solid #ddd;">
            </div>
            
            <!-- Results Section -->
            <div id="resultsSection" style="display: none;">
                <div style="font-weight: 600; margin-bottom: 10px; color: #333; text-align: center; font-family: 'Inter', Arial, sans-serif;">Professional Notes:</div>
                
                <div id="resultsOutput" style="padding: 10px; border-radius: 4px; font-size: 12px; 
                                              background: #f8f9fa; border: 1px solid #ddd; max-height: 200px; 
                                              overflow-y: auto; white-space: pre-wrap; font-family: monospace; 
                                              margin-bottom: 10px;">
                </div>
                
                <div id="enhancementInfo" style="margin-bottom: 10px; padding: 8px; background: #e8f5e8; 
                                                 border-radius: 4px; font-size: 11px; display: none;">
                    <strong>✨ Enhancements:</strong> <span id="enhancementSummary"></span>
                </div>
                
                <button id="copyResults" style="background: #007cba; color: white; border: none; 
                                               padding: 10px 20px; border-radius: 6px; cursor: pointer; 
                                               font-size: 14px; width: 100%;">📋 Copy Notes</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(container);
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('✅ Recorder UI created');
}

/**
 * Set up all event listeners for the UI
 */
function setupEventListeners() {
    try {
        // Mode switching
        const freeFlowBtn = document.getElementById('freeFlowMode');
        const questionBtn = document.getElementById('questionMode');
        
        freeFlowBtn.onclick = () => switchMode('freeflow');
        questionBtn.onclick = () => switchMode('question');
        
        // Recording controls
        document.getElementById('startRecording').onclick = startSpeechRecognition;
        document.getElementById('stopRecording').onclick = stopSpeechRecognition;
        document.getElementById('nextQuestion').onclick = handleNextQuestion;
        
        // Close button
        document.getElementById('closeRecorder').onclick = () => {
            handleStopRecording();
            clearAllCachedData();
        };
        
        // Copy button
        document.getElementById('copyResults').onclick = handleCopyResults;
        
        console.log('✅ Event listeners setup complete');
        
    } catch (error) {
        console.error('❌ Failed to setup event listeners:', error);
        throw error;
    }
}

/**
 * Switch between recording modes
 */
function switchMode(mode) {
    try {
        currentMode = mode;
        updateModeUI();
        
        // Reset question data when switching modes
        currentQuestionIndex = 0;
        questionAnswers = {};
        
        const status = document.getElementById('recorderStatus');
        if (mode === 'freeflow') {
            status.innerHTML = 'Free Flow mode - speak naturally about the lesson';
        } else {
            status.innerHTML = 'Question Mode - answer each question, then click Next';
        }
        
        console.log(`✅ Switched to ${mode} mode`);
        
    } catch (error) {
        console.error('❌ Failed to switch mode:', error);
    }
}

/**
 * Update the UI to reflect current mode
 */
function updateModeUI() {
    try {
        const freeFlowBtn = document.getElementById('freeFlowMode');
        const questionBtn = document.getElementById('questionMode');
        const questionDisplay = document.getElementById('questionDisplay');
        const nextQuestionBtn = document.getElementById('nextQuestion');
        
        if (currentMode === 'freeflow') {
            freeFlowBtn.style.background = '#3E8D58';
            freeFlowBtn.style.color = 'white';
            freeFlowBtn.style.border = '2px solid #4CAF50';
            
            questionBtn.style.background = 'white';
            questionBtn.style.color = '#333';
            questionBtn.style.border = '2px solid #ccc';
            
            questionDisplay.style.display = 'none';
            nextQuestionBtn.style.display = 'none';
        } else {
            questionBtn.style.background = '#3E49A0';
            questionBtn.style.color = 'white';
            questionBtn.style.border = '2px solid #4CAF50';
            
            freeFlowBtn.style.background = 'white';
            freeFlowBtn.style.color = '#333';
            freeFlowBtn.style.border = '2px solid #ccc';
            
            questionDisplay.style.display = 'block';
            updateCurrentQuestion();
        }
        
    } catch (error) {
        console.error('❌ Failed to update mode UI:', error);
    }
}

/**
 * Update the current question display
 */
function updateCurrentQuestion() {
    try {
        const currentQuestionDiv = document.getElementById('currentQuestion');
        if (currentQuestionDiv && questions[currentQuestionIndex]) {
            currentQuestionDiv.textContent = questions[currentQuestionIndex];
        }
    } catch (error) {
        console.error('❌ Failed to update current question:', error);
    }
}

// Continue with speech recognition functions...

/**
 * Initialize ASR client based on selected mode
 */
function initializeASRClient() {
    try {
        if (asrMode === 'cloud') {
            currentASRClient = new WhisperASRClient();
            console.log('✅ Initialized Whisper ASR client');
        } else {
            currentASRClient = new BrowserASRClient();
            console.log('✅ Initialized Browser ASR client');
        }
        
        // Set up callbacks
        currentASRClient.onPartial((text) => {
            handlePartialTranscript(text);
        });
        
        currentASRClient.onFinal((text) => {
            handleFinalTranscript(text);
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ Failed to initialize ASR client:', error);
        const status = document.getElementById('recorderStatus');
        if (status) {
            status.innerHTML = '❌ ASR initialization failed: ' + error.message;
        }
        return false;
    }
}

/**
 * Handle partial transcript from ASR
 */
function handlePartialTranscript(text) {
    // Update timing
    window.lastSpeechTime = Date.now();
    
    // Check if this is a fun processing message
    const isFunMessage = funProcessingMessages.some(msg => text.includes(msg.replace(/[🐺🍳📝🎭🔮🚀🧙‍♂️🎪🍕🦄]/g, '').trim()));
    
    if (isFunMessage || text.includes('Walking') || text.includes('Processing how')) {
        // Show fun processing message with special styling
        showFunProcessingMessage(text);
    } else {
        // Update live transcript display normally
        updateLiveTranscript(text);
    }
}

/**
 * Handle final transcript from ASR
 */
function handleFinalTranscript(text) {
    let newText = text.trim();
    
    // For Whisper mode, text processing is handled in handleNextQuestion()
    // This handles the continuous Browser ASR mode
    if (asrMode === 'browser') {
        // Capitalize first word
        if (!finalTranscript.trim()) {
            newText = newText.charAt(0).toUpperCase() + newText.slice(1);
        } else if (finalTranscript.trim().endsWith('.')) {
            newText = newText.charAt(0).toUpperCase() + newText.slice(1);
        }
        
        finalTranscript += newText + ' ';
        
        // Add to current question transcript in question mode
        if (currentMode === 'question') {
            if (!currentQuestionTranscript.trim()) {
                newText = newText.charAt(0).toUpperCase() + newText.slice(1);
            }
            currentQuestionTranscript += newText + ' ';
        }
        
        // Update timing
        window.lastSpeechTime = Date.now();
        
        // Update live transcript display
        updateLiveTranscript('');
    }
}

/**
 * Update recording UI state
 */
function updateRecordingUI(recording) {
    const startBtn = document.getElementById('startRecording');
    const stopBtn = document.getElementById('stopRecording');
    const status = document.getElementById('recorderStatus');
    const liveTranscript = document.getElementById('liveTranscript');
    const recordingIndicator = document.getElementById('recordingIndicator');
    const micStatus = document.getElementById('micStatus');
    
    if (recording) {
        // Update visual recording indicator
        if (recordingIndicator) {
            recordingIndicator.classList.add('recording');
            recordingIndicator.classList.remove('error');
        }
        if (micStatus) {
            micStatus.textContent = 'Recording notes...';
            micStatus.style.color = '#4CAF50';
        }
        
        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
        if (liveTranscript) liveTranscript.style.display = 'block';
        
        if (currentMode === 'question') {
            const nextQuestionBtn = document.getElementById('nextQuestion');
            if (nextQuestionBtn) {
                nextQuestionBtn.style.display = 'inline-block';
                nextQuestionBtn.textContent = currentQuestionIndex === questions.length - 1 ? 'Finish →' : 'Next Question →';
            }
            if (status) {
                status.innerHTML = `🎤 Recording: ${questions[currentQuestionIndex]}`;
            }
        } else {
            if (status) {
                status.innerHTML = '🎤 Listening... Speak naturally about the lesson';
            }
        }
        
        if (status) status.style.background = '#cce7ff';
        
    } else {
        // Update visual recording indicator
        if (recordingIndicator) {
            recordingIndicator.classList.remove('recording');
            recordingIndicator.classList.remove('error');
        }
        if (micStatus) {
            micStatus.textContent = 'Ready to record';
            micStatus.style.color = '#666';
        }
        
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (liveTranscript) liveTranscript.style.display = 'none';
        
        const nextQuestionBtn = document.getElementById('nextQuestion');
        if (nextQuestionBtn) nextQuestionBtn.style.display = 'none';
    }
}

/**
 * Show fallback banner when cloud ASR fails
 */
function showFallbackBanner() {
    // Check if banner already exists
    let banner = document.getElementById('fallback-banner');
    if (banner) return;
    
    // Create fallback banner
    banner = document.createElement('div');
    banner.id = 'fallback-banner';
    banner.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10001;
        background: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
        border-radius: 6px;
        padding: 10px 15px;
        font-size: 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        max-width: 400px;
        text-align: center;
    `;
    banner.innerHTML = '☁️ Cloud ASR unavailable — falling back to browser speech recognition';
    
    document.body.appendChild(banner);
    
    // Auto-remove banner after 5 seconds
    setTimeout(() => {
        if (banner && banner.parentNode) {
            banner.parentNode.removeChild(banner);
        }
    }, 5000);
}

// Old speech recognition handlers removed - now using ASR client abstraction

/**
 * Start pause detection for automatic period insertion
 */
function startPauseDetection() {
    pauseCheckInterval = setInterval(() => {
        const currentTime = Date.now();
        const timeSinceLastSpeech = currentTime - window.lastSpeechTime;
        
        if (timeSinceLastSpeech > 1300 && finalTranscript.trim()) {
            if (!/[.!?]$/.test(finalTranscript.trim())) {
                finalTranscript = finalTranscript.trim() + '. ';
                console.log('Added period due to pause');
                updateLiveTranscript('');
            }
            
            // Also handle currentQuestionTranscript in question mode
            if (currentMode === 'question' && currentQuestionTranscript.trim()) {
                if (!/[.!?]$/.test(currentQuestionTranscript.trim())) {
                    currentQuestionTranscript = currentQuestionTranscript.trim() + '. ';
                    console.log('Added period to current question answer due to pause');
                    updateLiveTranscript('');
                }
            }
        }
    }, 200);
}

/**
 * Show fun processing message with subtle animation
 */
function showFunProcessingMessage(message) {
    const liveTranscript = document.getElementById('liveTranscript');
    if (!liveTranscript) return;
    
    // Create subtly animated message
    liveTranscript.innerHTML = `
        <div style="animation: gentleWobble 1.5s ease-in-out infinite;">
            <strong>Processing:</strong> ${message}
        </div>
        <style>
            @keyframes gentleWobble {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-2px); }
            }
        </style>
    `;
    
    liveTranscript.scrollTop = liveTranscript.scrollHeight;
}

/**
 * Update the live transcript display
 */
function updateLiveTranscript(interim) {
    const liveTranscript = document.getElementById('liveTranscript');
    if (!liveTranscript) return;
    
    if (currentMode === 'question') {
        liveTranscript.innerHTML = `<strong>Live:</strong> ${interim}<br><strong>Current Answer:</strong> ${currentQuestionTranscript}`;
    } else {
        liveTranscript.innerHTML = `<strong>Live:</strong> ${interim}<br><strong>Final:</strong> ${finalTranscript}`;
    }
    
    liveTranscript.scrollTop = liveTranscript.scrollHeight;
}

/**
 * Start ASR recording with fallback logic
 */
async function startSpeechRecognition() {
    try {
        if (!currentASRClient) {
            if (!initializeASRClient()) {
                return;
            }
        }
        
        if (!isRecording) {
            isRecording = true;
            finalTranscript = '';
            
            // Show recording state immediately
            updateRecordingUI(true);
            
            try {
                // Try to start ASR client
                await currentASRClient.start();
                console.log('✅ ASR started successfully');
                
                // Initialize timing and reset variables
                window.lastSpeechTime = Date.now();
                lastResultIndex = 0;
                lastTranscriptLength = 0;
                
                // Start pause detection
                startPauseDetection();
                
            } catch (error) {
                console.error('❌ ASR failed:', error);
                
                // If cloud ASR fails, try fallback to browser ASR
                if (asrMode === 'cloud') {
                    console.log('☁️ Cloud ASR failed, attempting browser fallback...');
                    showFallbackBanner();
                    
                    // Switch to browser ASR
                    asrMode = 'browser';
                    currentASRClient = new BrowserASRClient();
                    
                    // Set up callbacks for fallback client
                    currentASRClient.onPartial((text) => {
                        handlePartialTranscript(text);
                    });
                    
                    currentASRClient.onFinal((text) => {
                        handleFinalTranscript(text);
                    });
                    
                    try {
                        await currentASRClient.start();
                        console.log('✅ Fallback to browser ASR successful');
                        
                        // Initialize timing and reset variables
                        window.lastSpeechTime = Date.now();
                        lastResultIndex = 0;
                        lastTranscriptLength = 0;
                        
                        // Start pause detection
                        startPauseDetection();
                        
                    } catch (fallbackError) {
                        console.error('❌ Browser ASR fallback also failed:', fallbackError);
                        throw fallbackError;
                    }
                } else {
                    throw error;
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to start ASR:', error);
        isRecording = false;
        updateRecordingUI(false);
        
        const status = document.getElementById('recorderStatus');
        if (status) {
            status.innerHTML = 'Failed to start recording: ' + error.message;
            status.style.background = '#f8d7da';
        }
    }
}

/**
 * Stop ASR recording
 */
function stopSpeechRecognition() {
    try {
        if (currentASRClient && isRecording) {
            currentASRClient.stop();
            console.log('✅ ASR stopped');
        }
        
        // Cleanup
        if (pauseCheckInterval) {
            clearInterval(pauseCheckInterval);
            pauseCheckInterval = null;
        }
        
        isRecording = false;
        updateRecordingUI(false);
        
        // Process results if we have transcript
        if (finalTranscript.trim()) {
            setTimeout(() => {
                processRecordingResults();
            }, 500); // Brief delay to ensure final processing
        } else {
            const status = document.getElementById('recorderStatus');
            if (status) {
                status.innerHTML = '❌ No speech detected. Please try again.';
                status.style.background = '#f8d7da';
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to stop ASR:', error);
        isRecording = false;
        updateRecordingUI(false);
    }
}

/**
 * Handle next question button click
 */
async function handleNextQuestion() {
    try {
        const nextQuestionBtn = document.getElementById('nextQuestion');
        
        // Show processing state and disable button
        if (nextQuestionBtn) {
            nextQuestionBtn.disabled = true;
            nextQuestionBtn.textContent = '⏳ Processing...';
            nextQuestionBtn.style.background = '#666';
            console.log('🔄 Button set to processing state');
        }
        
        // For Whisper: Process current segment immediately
        if (asrMode === 'cloud' && currentASRClient instanceof WhisperASRClient) {
            console.log('☁️ Processing Whisper segment for current question');
            const segmentText = await currentASRClient.processCurrentSegment();
            
            if (segmentText) {
                questionAnswers[currentQuestionIndex] = segmentText;
                console.log(`💾 Saved Whisper answer for question ${currentQuestionIndex}:`, segmentText);
                
                // Update live display with processed text
                const liveDiv = document.getElementById('liveTranscript');
                if (liveDiv) {
                    liveDiv.innerHTML = `<strong>Processed:</strong> ${segmentText}`;
                }
            }
        } else {
            // For browser ASR: Use existing transcript logic with delay
            await new Promise(resolve => setTimeout(resolve, 1500)); // Shorter delay for browser ASR
            
            // Save current question's answer
            let currentAnswer = currentQuestionTranscript.trim();
            
            // If no current question transcript, try using the global finalTranscript
            if (!currentAnswer && finalTranscript.trim()) {
                console.log('⚠️ Using finalTranscript as fallback for current question');
                currentAnswer = finalTranscript.trim();
            }
            
            if (currentAnswer) {
                questionAnswers[currentQuestionIndex] = currentAnswer;
                console.log(`💾 Saved browser ASR answer for question ${currentQuestionIndex}:`, currentAnswer);
            }
        }
        
        // Move to next question
        currentQuestionIndex++;
        console.log(`🔢 Moved to question index: ${currentQuestionIndex}, total questions: ${questions.length}`);
        
        if (currentQuestionIndex < questions.length) {
            console.log(`✅ Showing question ${currentQuestionIndex + 1} of ${questions.length}`);
            // Show next question
            updateCurrentQuestion();
            
            // Clear transcripts for fresh start
            currentQuestionTranscript = '';
            finalTranscript = '';
            
            // Clear live transcript display
            const liveDiv = document.getElementById('liveTranscript');
            if (liveDiv) {
                liveDiv.innerHTML = '<strong>Live:</strong> <br><strong>Current Answer:</strong> ';
            }
            
            // Update status and button
            const status = document.getElementById('recorderStatus');
            if (status) {
                status.innerHTML = `🎤 Recording: ${questions[currentQuestionIndex]}`;
            }
            
            // Re-enable button with next question text
            if (nextQuestionBtn) {
                nextQuestionBtn.disabled = false;
                nextQuestionBtn.style.background = '#007cba';
                nextQuestionBtn.textContent = currentQuestionIndex === questions.length - 1 ? 'Finish →' : 'Next Question →';
                console.log('✅ Button re-enabled for next question');
            }
        } else {
            console.log(`🏁 Finished all questions.`);
            
            // Compile results and stop recording
            compileQuestionResults();
            
            // Stop recording immediately after final question
            if (currentASRClient && isRecording) {
                console.log('🛑 Stopping ASR client after final question');
                currentASRClient.stop();
                isRecording = false;
                updateRecordingUI(false);
            }
            
            // Process and send results to popup
            console.log('📤 Processing results for popup display');
            processRecordingResults();
        }
        
    } catch (error) {
        console.error('❌ Failed to handle next question:', error);
        
        // Reset button state on error
        const nextQuestionBtn = document.getElementById('nextQuestion');
        if (nextQuestionBtn) {
            nextQuestionBtn.disabled = false;
            nextQuestionBtn.style.background = '#007cba';
            nextQuestionBtn.textContent = 'Next Question →';
        }
    }
}

/**
 * Compile question results into formatted text
 */
function compileQuestionResults() {
    try {
        let compiledText = '';
        
        console.log('Compiling question results:', questionAnswers);
        
        for (let i = 0; i < questions.length; i++) {
            if (questionAnswers[i] && questionAnswers[i].trim()) {
                const titleCase = questions[i].split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
                
                // Add question header and answer
                compiledText += `[${titleCase}]\n`;
                compiledText += questionAnswers[i].trim();
                
                // Add double spacing between all questions (like the working version)
                if (i < questions.length - 1) {
                    compiledText += '\n\n\n';
                } else {
                    compiledText += '\n';
                }
                
                console.log(`📝 Added question ${i + 1}: ${titleCase}`);
                console.log(`📝 Current compiled text length: ${compiledText.length}`);
            }
        }
        
        console.log('📝 Final compiled text:');
        console.log(JSON.stringify(compiledText)); // This will show exact characters including \n
        console.log('📝 Compiled text preview:', compiledText);
        finalTranscript = compiledText;
        
        // Reset question state
        const questionDisplay = document.getElementById('questionDisplay');
        const nextQuestionBtn = document.getElementById('nextQuestion');
        
        if (questionDisplay) questionDisplay.style.display = 'none';
        if (nextQuestionBtn) nextQuestionBtn.style.display = 'none';
        
        currentQuestionIndex = 0;
        currentQuestionTranscript = '';
        
    } catch (error) {
        console.error('❌ Failed to compile question results:', error);
    }
}

/**
 * Process recording results and apply text enhancement
 */
async function processRecordingResults() {
    try {
        const status = document.getElementById('recorderStatus');
        if (status) {
            status.innerHTML = '⚙️ Applying AI enhancements...';
            status.style.background = '#fff3cd';
        }
        
        // Store raw text - don't trim at all to preserve spacing structure
        rawText = finalTranscript;
        console.log('📝 Raw text before enhancement:', JSON.stringify(rawText));
        
        // For question mode, skip text enhancement to preserve formatting
        if (currentMode === 'question') {
            enhancedText = rawText;
            console.log('📝 Skipping text enhancement for question mode to preserve formatting');
        } else {
            // Apply text enhancement if available for free flow mode
            if (window.enhancedCleanupSpeechText) {
                const result = window.enhancedCleanupSpeechText(rawText, { template: 'general' });
                enhancedText = result.text;
                
                // Show enhancement info
                const enhancementInfo = document.getElementById('enhancementInfo');
                const enhancementSummary = document.getElementById('enhancementSummary');
                
                if (enhancementInfo && enhancementSummary) {
                    enhancementSummary.textContent = result.enhancements || 'Professional formatting applied';
                    enhancementInfo.style.display = 'block';
                }
            } else {
                // Fallback if text processor not available
                enhancedText = rawText;
            }
        }
        
        console.log('📝 Enhanced text after processing:', JSON.stringify(enhancedText));
        
        // Store results globally and update display
        window.recordingResults = { 
            raw: rawText, 
            enhanced: enhancedText 
        };
        
        updateResultsDisplay();
        
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }
        
        if (status) {
            status.innerHTML = '✅ Professional lesson notes ready!';
            status.style.background = '#d4edda';
        }
        
        // Send results to popup
        chrome.runtime.sendMessage({ 
            action: 'recordingComplete',
            data: {
                raw: rawText,
                enhanced: enhancedText
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to process recording results:', error);
        const status = document.getElementById('recorderStatus');
        if (status) {
            status.innerHTML = 'Error processing results: ' + error.message;
            status.style.background = '#f8d7da';
        }
    }
}

/**
 * Update the results display
 */
function updateResultsDisplay() {
    try {
        if (!window.recordingResults) return;
        
        const output = document.getElementById('resultsOutput');
        if (!output) return;
        
        // Convert newlines to HTML breaks and make bracketed questions bold
        const formattedText = window.recordingResults.enhanced
            .replace(/\n/g, '<br>')
            .replace(/\[([^\]]+)\]/g, '<strong>[$1]</strong>');
        
        output.innerHTML = formattedText;
        
        const enhancementInfo = document.getElementById('enhancementInfo');
        if (enhancementInfo) {
            enhancementInfo.style.display = 'block';
        }
        
    } catch (error) {
        console.error('❌ Failed to update results display:', error);
    }
}

/**
 * Handle copy results to clipboard
 */
function handleCopyResults() {
    try {
        if (!window.recordingResults || !window.recordingResults.enhanced) {
            console.warn('No results to copy');
            return;
        }
        
        const textToCopy = window.recordingResults.enhanced;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            const copyBtn = document.getElementById('copyResults');
            if (copyBtn) {
                copyBtn.innerHTML = '✅ Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = '📋 Copy Notes';
                }, 3000);
            }
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            const copyBtn = document.getElementById('copyResults');
            if (copyBtn) {
                copyBtn.innerHTML = '✅ Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = '📋 Copy Notes';
                }, 3000);
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to copy results:', error);
    }
}

/**
 * Clear all cached recording data for fresh start
 */
function clearAllCachedData() {
    console.log('🧹 Clearing all cached recording data');
    
    // Reset all global variables
    finalTranscript = '';
    rawText = '';
    enhancedText = '';
    currentQuestionTranscript = '';
    questionAnswers = {};
    currentQuestionIndex = 0;
    
    // Clear any stored results
    if (window.recordingResults) {
        delete window.recordingResults;
    }
    
    // Clear any timers
    if (pauseCheckInterval) {
        clearInterval(pauseCheckInterval);
        pauseCheckInterval = null;
    }
    
    console.log('✅ All cached data cleared - ready for fresh start');
}

// Add page cleanup listeners for fresh start
window.addEventListener('beforeunload', () => {
    console.log('🔄 Page unloading - cleaning up recording data');
    clearAllCachedData();
    if (currentASRClient && isRecording) {
        currentASRClient.stop();
    }
});

// Also clear when the page becomes hidden (user switches tabs/closes)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('👁️ Page hidden - cleaning up for fresh start');
        clearAllCachedData();
    }
});

console.log('✅ Enhanced content script fully loaded and ready');
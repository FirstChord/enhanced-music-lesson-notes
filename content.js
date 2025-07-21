// Enhanced Music Lesson Notes Extension - Content Script
// Handles speech recognition and UI injection

console.log('🎵 Enhanced Lesson Notes content script loaded on:', window.location.href);

// Global variables for speech recognition
let recognition = null;
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

const questions = [
    "What did we do in the lesson?",
    "What went well or what was challenging?",
    "What would be good to practice for next week?"
];

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Content script received message:', request);
    
    try {
        switch (request.action) {
            case 'startRecording':
                handleStartRecording(request.config)
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
        
        // Create the recorder UI
        await createRecorderUI();
        
        // Initialize speech recognition
        initializeSpeechRecognition();
        
        // Apply configuration
        if (config.mode) {
            currentMode = config.mode;
            updateModeUI();
        }
        
        // Send confirmation to popup
        chrome.runtime.sendMessage({ 
            action: 'recordingReady',
            data: { mode: currentMode }
        });
        
        console.log('✅ Recording setup complete');
        
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
        if (recognition && isRecording) {
            recognition.stop();
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
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15); font-family: Arial, sans-serif; 
                    max-width: 420px; max-height: 80vh; overflow-y: auto;">
            
            <button id="closeRecorder" style="position: absolute; top: 10px; right: 10px; 
                                             background: #666; color: white; border: none; 
                                             padding: 5px 10px; border-radius: 4px; cursor: pointer;">✕</button>
            
            <div style="font-weight: bold; margin-bottom: 15px; color: #333;">🎵 Enhanced Lesson Notes</div>
            
            <!-- Recording Mode Selection -->
            <div style="margin-bottom: 15px; display: flex; gap: 10px;">
                <button id="freeFlowMode" style="flex: 1; padding: 8px; border: 2px solid #ccc; 
                                               background: white; color: #333; border-radius: 4px; 
                                               cursor: pointer; font-size: 12px;">
                    📝 Free Flow
                </button>
                <button id="questionMode" style="flex: 1; padding: 8px; border: 2px solid #4CAF50; 
                                              background: #4CAF50; color: white; border-radius: 4px; 
                                              cursor: pointer; font-size: 12px;">
                    ❓ Question Mode
                </button>
            </div>

            <!-- Question Display -->
            <div id="questionDisplay" style="display: block; margin-bottom: 15px; padding: 10px; 
                                           background: #f0f8ff; border-radius: 6px; 
                                           border: 1px solid #4CAF50;">
                <div style="font-size: 11px; color: #666; margin-bottom: 5px;">Current Question:</div>
                <div id="currentQuestion" style="font-size: 14px; font-weight: bold; color: #333;">
                    What did we do in the lesson?
                </div>
            </div>
            
            <!-- Recording Controls -->
            <div style="margin-bottom: 15px;">
                <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                    <button id="startRecording" style="background: #4CAF50; color: white; border: none; 
                                                     padding: 10px 20px; border-radius: 6px; cursor: pointer; 
                                                     font-size: 14px; flex: 1;">🎤 Start</button>
                    <button id="stopRecording" disabled style="background: #f44336; color: white; border: none; 
                                                              padding: 10px 20px; border-radius: 6px; cursor: pointer; 
                                                              font-size: 14px; flex: 1;">⏹️ Stop</button>
                </div>
                <button id="nextQuestion" style="display: none; background: #007cba; color: white; border: none; 
                                               padding: 10px 20px; border-radius: 6px; cursor: pointer; 
                                               font-size: 14px; width: 100%;">Next Question →</button>
            </div>
            
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
                <div style="font-weight: bold; margin-bottom: 10px; color: #333;">📝 Professional Notes:</div>
                
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
            freeFlowBtn.style.background = '#4CAF50';
            freeFlowBtn.style.color = 'white';
            freeFlowBtn.style.border = '2px solid #4CAF50';
            
            questionBtn.style.background = 'white';
            questionBtn.style.color = '#333';
            questionBtn.style.border = '2px solid #ccc';
            
            questionDisplay.style.display = 'none';
            nextQuestionBtn.style.display = 'none';
        } else {
            questionBtn.style.background = '#4CAF50';
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
 * Initialize speech recognition
 */
function initializeSpeechRecognition() {
    try {
        // Check for speech recognition support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            const status = document.getElementById('recorderStatus');
            if (status) {
                status.innerHTML = '❌ Speech recognition not supported';
            }
            const startBtn = document.getElementById('startRecording');
            if (startBtn) {
                startBtn.disabled = true;
            }
            return false;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        // Configure recognition
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Set up event handlers
        setupSpeechRecognitionHandlers();
        
        console.log('✅ Speech recognition initialized');
        return true;
        
    } catch (error) {
        console.error('❌ Failed to initialize speech recognition:', error);
        return false;
    }
}

/**
 * Set up speech recognition event handlers
 */
function setupSpeechRecognitionHandlers() {
    if (!recognition) return;
    
    recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        isRecording = true;
        
        const startBtn = document.getElementById('startRecording');
        const stopBtn = document.getElementById('stopRecording');
        const status = document.getElementById('recorderStatus');
        const liveTranscript = document.getElementById('liveTranscript');
        
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
        
        // Initialize timing and reset variables
        window.lastSpeechTime = Date.now();
        lastResultIndex = 0;
        lastTranscriptLength = 0;
        
        // Start pause detection
        startPauseDetection();
    };
    
    recognition.onresult = (event) => {
        let interim = '';
        
        // Process new results
        for (let i = lastResultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            
            if (result.isFinal) {
                let newText = transcript.trim();
                
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
                
                lastResultIndex = i + 1;
            } else {
                interim += transcript;
            }
        }
        
        // Update timing
        const currentLength = finalTranscript.length + interim.length;
        if (currentLength > lastTranscriptLength) {
            window.lastSpeechTime = Date.now();
            lastTranscriptLength = currentLength;
        }
        
        // Update live transcript display
        updateLiveTranscript(interim);
    };
    
    recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        
        // Cleanup
        if (pauseCheckInterval) {
            clearInterval(pauseCheckInterval);
            pauseCheckInterval = null;
        }
        
        isRecording = false;
        
        const startBtn = document.getElementById('startRecording');
        const stopBtn = document.getElementById('stopRecording');
        const liveTranscript = document.getElementById('liveTranscript');
        const nextQuestionBtn = document.getElementById('nextQuestion');
        
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (liveTranscript) liveTranscript.style.display = 'none';
        if (nextQuestionBtn) nextQuestionBtn.style.display = 'none';
        
        // Process results if we have transcript
        if (finalTranscript.trim()) {
            processRecordingResults();
        } else {
            const status = document.getElementById('recorderStatus');
            if (status) {
                status.innerHTML = '❌ No speech detected. Please try again.';
                status.style.background = '#f8d7da';
            }
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        let errorMsg = 'Error: ' + event.error;
        if (event.error === 'not-allowed') {
            errorMsg = 'Microphone access denied. Please allow microphone access and try again.';
        } else if (event.error === 'no-speech') {
            errorMsg = 'No speech detected. Please speak more clearly and try again.';
        }
        
        const status = document.getElementById('recorderStatus');
        if (status) {
            status.innerHTML = errorMsg;
            status.style.background = '#f8d7da';
        }
        
        // Reset UI state
        isRecording = false;
        const startBtn = document.getElementById('startRecording');
        const stopBtn = document.getElementById('stopRecording');
        const liveTranscript = document.getElementById('liveTranscript');
        
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (liveTranscript) liveTranscript.style.display = 'none';
    };
}

/**
 * Start pause detection for automatic period insertion
 */
function startPauseDetection() {
    pauseCheckInterval = setInterval(() => {
        const currentTime = Date.now();
        const timeSinceLastSpeech = currentTime - window.lastSpeechTime;
        
        if (timeSinceLastSpeech > 1500 && finalTranscript.trim()) {
            if (!/[.!?]$/.test(finalTranscript.trim())) {
                finalTranscript = finalTranscript.trim() + '. ';
                console.log('Added period due to pause');
                updateLiveTranscript('');
            }
        }
    }, 200);
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
 * Start speech recognition
 */
function startSpeechRecognition() {
    try {
        if (!recognition) {
            if (!initializeSpeechRecognition()) {
                return;
            }
        }
        
        if (!isRecording) {
            finalTranscript = '';
            recognition.start();
        }
        
    } catch (error) {
        console.error('❌ Failed to start speech recognition:', error);
        const status = document.getElementById('recorderStatus');
        if (status) {
            status.innerHTML = 'Failed to start recording: ' + error.message;
            status.style.background = '#f8d7da';
        }
    }
}

/**
 * Stop speech recognition
 */
function stopSpeechRecognition() {
    try {
        if (recognition && isRecording) {
            recognition.stop();
        }
    } catch (error) {
        console.error('❌ Failed to stop speech recognition:', error);
    }
}

/**
 * Handle next question button click
 */
function handleNextQuestion() {
    try {
        // Save current question's answer
        if (currentQuestionTranscript.trim()) {
            questionAnswers[currentQuestionIndex] = currentQuestionTranscript.trim();
        }
        
        // Move to next question
        currentQuestionIndex++;
        
        if (currentQuestionIndex < questions.length) {
            // Show next question
            updateCurrentQuestion();
            
            // Clear current question transcript
            currentQuestionTranscript = '';
            
            // Clear live transcript display
            const liveDiv = document.getElementById('liveTranscript');
            if (liveDiv) {
                liveDiv.innerHTML = '<strong>Live:</strong> <br><strong>Current Answer:</strong> ';
            }
            
            // Update status and button
            const status = document.getElementById('recorderStatus');
            const nextQuestionBtn = document.getElementById('nextQuestion');
            
            if (status) {
                status.innerHTML = `🎤 Recording: ${questions[currentQuestionIndex]}`;
            }
            
            if (nextQuestionBtn) {
                nextQuestionBtn.style.display = 'inline-block';
                nextQuestionBtn.textContent = currentQuestionIndex === questions.length - 1 ? 'Finish →' : 'Next Question →';
            }
        } else {
            // Save final answer
            if (currentQuestionTranscript.trim()) {
                questionAnswers[currentQuestionIndex] = currentQuestionTranscript.trim();
            } else if (finalTranscript.trim()) {
                questionAnswers[currentQuestionIndex] = finalTranscript.trim();
            }
            
            // Compile results and stop recording
            compileQuestionResults();
            
            if (recognition && isRecording) {
                recognition.stop();
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to handle next question:', error);
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
                
                // Add spacing before each question (except the first)
                if (compiledText.length > 0) {
                    compiledText += '\n\n';
                }
                
                // Add question header and answer
                compiledText += `[${titleCase}]
`;
                compiledText += questionAnswers[i].trim() + '\n';
            }
        }
        
        console.log('Compiled text:', compiledText);
        finalTranscript = compiledText.trim();
        
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
        
        // Store raw text
        rawText = finalTranscript.trim();
        
        // Apply text enhancement if available
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

console.log('✅ Enhanced content script fully loaded and ready');
// Enhanced Music Lesson Notes Extension - popup.js
// Updated version with advanced text processing

class LessonNotesManager {
    constructor() {
        console.log('🚀 Enhanced Extension initializing...');
        
        // Initialize enhanced text processor settings
        this.processorConfig = {
            schoolName: 'Your Music School', // You can customize this
            defaultInstrument: 'general',
            outputFormat: 'mymusicstaff'
        };
        
        this.initializeElements();
        this.bindEvents();
        this.checkPermissions();
    }
    
    initializeElements() {
        this.pageRecordBtn = document.getElementById('pageRecordBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.newBtn = document.getElementById('newBtn');
        this.outputSection = document.getElementById('outputSection');
        this.outputBox = document.getElementById('outputBox');
        this.status = document.getElementById('status');
        
        console.log('✅ Elements initialized');
    }
    
    async checkPermissions() {
        console.log('🔍 Checking permissions...');
        
        try {
            if (typeof chrome !== 'undefined' && chrome.scripting) {
                console.log('✅ chrome.scripting available');
                this.showStatus('Ready to inject enhanced speech recorder', 'success');
            } else {
                console.log('❌ chrome.scripting not available');
                this.showStatus('Scripting API not available', 'error');
                this.pageRecordBtn.disabled = true;
            }
        } catch (error) {
            console.error('Permission check error:', error);
            this.showStatus(`Permission error: ${error.message}`, 'error');
        }
    }
    
    bindEvents() {
        console.log('🔗 Binding events...');
        
        this.pageRecordBtn.addEventListener('click', () => {
            console.log('🎤 Enhanced page record clicked');
            this.startPageRecording();
        });
        
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.newBtn.addEventListener('click', () => this.resetForNewRecording());
        
        console.log('✅ Events bound');
    }
    
    async startPageRecording() {
        console.log('🚀 Starting enhanced page recording...');
        
        try {
            this.showStatus('Injecting enhanced recorder...', 'info');
            
            // Step 1: Inject the enhanced UI
            await chrome.scripting.executeScript({
                target: { tabId: await this.getCurrentTabId() },
                func: function() {
                    console.log('Creating enhanced recorder UI');
                    
                    // Remove existing recorder
                    const existing = document.getElementById('lesson-notes-recorder');
                    if (existing) existing.remove();
                    
                    // Smart positioning - avoid top-right where extension popup appears
                    let position = 'top: 80px; right: 20px;';
                    
                    // Check if we're near the extension icon area (rough detection)
                    if (window.innerWidth < 800) {
                        // On smaller screens, put it on the left
                        position = 'top: 20px; left: 20px;';
                    }
                    
                    // Create main container with enhanced features
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

<!-- Question Display (now visible by default) -->
<div id="questionDisplay" style="display: block; margin-bottom: 15px; padding: 10px; 
                               background: #f0f8ff; border-radius: 6px; 
                               border: 1px solid #4CAF50;">
    <div style="font-size: 11px; color: #666; margin-bottom: 5px;">Current Question:</div>
    <div id="currentQuestion" style="font-size: 14px; font-weight: bold; color: #333;">
        What did we do in the lesson?
    </div>
</div>
        
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
        
       <div id="recorderStatus" style="padding: 8px; border-radius: 4px; font-size: 12px; 
                               background: #cce7ff; color: #004085; margin-bottom: 10px;">
    Question Mode - speak your answer then click Next
</div>
        
        <div id="liveTranscript" style="display: none; padding: 8px; border-radius: 4px; 
                                        font-size: 12px; background: #f9f9f9; max-height: 100px; 
                                        overflow-y: auto; margin-bottom: 10px; border: 1px solid #ddd;">
        </div>
        
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
                    console.log('✅ Enhanced recorder UI created');
                }
            });
            
  // Step 2: Inject enhanced speech recognition functionality
await chrome.scripting.executeScript({
    target: { tabId: await this.getCurrentTabId() },
    func: function() {
        console.log('Setting up enhanced speech recognition...');
        
        let recognition = null;
        let isRecording = false;
        let finalTranscript = '';
        let rawText = '';
        let enhancedText = '';
        let lastResultIndex = 0;
        let lastInterimText = '';  
        let pauseCheckInterval = null;
let lastTranscriptLength = 0;
let currentMode = 'question'; // 'freeflow' or 'question'
let currentQuestionIndex = 0;
let questionAnswers = {};
let currentQuestionTranscript = '';


const questions = [
     "What did we do in the lesson?",
    "What went well or what was challenging?",
    "What would be good to practice for next week?"
];
        
        // Check for speech recognition support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            document.getElementById('recorderStatus').innerHTML = '❌ Speech recognition not supported';
            document.getElementById('startRecording').disabled = true;
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        // Configure recognition
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Get DOM elements
        const startBtn = document.getElementById('startRecording');
        const stopBtn = document.getElementById('stopRecording');
        const status = document.getElementById('recorderStatus');
        const liveTranscript = document.getElementById('liveTranscript');
        const resultsSection = document.getElementById('resultsSection');
        const resultsOutput = document.getElementById('resultsOutput');
        const enhancementInfo = document.getElementById('enhancementInfo');
        const enhancementSummary = document.getElementById('enhancementSummary');
        const templateSelect = document.getElementById('templateSelect');
        const freeFlowBtn = document.getElementById('freeFlowMode');
const questionBtn = document.getElementById('questionMode');
const questionDisplay = document.getElementById('questionDisplay');
const currentQuestionDiv = document.getElementById('currentQuestion');
const nextQuestionBtn = document.getElementById('nextQuestion');

// Mode switching
freeFlowBtn.onclick = () => {
    currentMode = 'freeflow';
    freeFlowBtn.style.background = '#4CAF50';
    freeFlowBtn.style.color = 'white';
    freeFlowBtn.style.border = '2px solid #4CAF50';
    
    questionBtn.style.background = 'white';
    questionBtn.style.color = '#333';
    questionBtn.style.border = '2px solid #ccc';
    
    questionDisplay.style.display = 'none';
    nextQuestionBtn.style.display = 'none';
    
    // Reset question data when switching modes
    currentQuestionIndex = 0;
    questionAnswers = {};
    
    status.innerHTML = 'Free Flow mode - speak naturally about the lesson';
};

questionBtn.onclick = () => {
    currentMode = 'question';
    questionBtn.style.background = '#4CAF50';
    questionBtn.style.color = 'white';
    questionBtn.style.border = '2px solid #4CAF50';
    
    freeFlowBtn.style.background = 'white';
    freeFlowBtn.style.color = '#333';
    freeFlowBtn.style.border = '2px solid #ccc';
    
    questionDisplay.style.display = 'block';
    currentQuestionIndex = 0;
    questionAnswers = {};
    currentQuestionDiv.textContent = questions[0];
    
    status.innerHTML = 'Question Mode - answer each question, then click Next';
};

// Next question button
nextQuestionBtn.onclick = () => {
    // Save the current question's answer
    if (currentQuestionTranscript.trim()) {
        questionAnswers[currentQuestionIndex] = currentQuestionTranscript.trim();
    }
    
    // Move to next question
    currentQuestionIndex++;
    
    if (currentQuestionIndex < questions.length) {
        // Show next question
        currentQuestionDiv.textContent = questions[currentQuestionIndex];
        
        // Clear ONLY the current question transcript
        currentQuestionTranscript = '';
        
        // Clear the live transcript display
        const liveDiv = document.getElementById('liveTranscript');
        if (liveDiv) {
            liveDiv.innerHTML = '<strong>Live:</strong> <br><strong>Current Answer:</strong> ';
        }
        
        // Update status
        status.innerHTML = `🎤 Recording: ${questions[currentQuestionIndex]}`;
        
        // Keep the Next button visible
        nextQuestionBtn.style.display = 'inline-block';
        
        // Update button text for last question
        if (currentQuestionIndex === questions.length - 1) {
            nextQuestionBtn.textContent = 'Finish →';
        }
    } else {
        // Save the final answer - make sure we get the current question transcript
        if (currentQuestionTranscript.trim()) {
            questionAnswers[currentQuestionIndex] = currentQuestionTranscript.trim();
        } else if (finalTranscript.trim()) {
            // Fallback: if currentQuestionTranscript is empty, use finalTranscript
            questionAnswers[currentQuestionIndex] = finalTranscript.trim();
        }
        
        // Compile the results BEFORE stopping
        compileQuestionResults();
        
        // NOW stop recording
        if (recognition && isRecording) {
            recognition.stop();
        }
    }
};

// Alternative version using a blank line with a space to preserve formatting:
function compileQuestionResults() {
    let compiledText = '';
    
    // Debug logging
    console.log('Compiling question results:', questionAnswers);
    console.log('Current question index:', currentQuestionIndex);
    console.log('Current question transcript:', currentQuestionTranscript);
    
    for (let i = 0; i < questions.length; i++) {
        if (questionAnswers[i] && questionAnswers[i].trim()) {
            const titleCase = questions[i].split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            
            // Add spacing before each question (except the first one)
            if (compiledText.length > 0) {
                compiledText += '\n\n'; // Double newline for less space
            }
            
            // Bold question without brackets
            compiledText += `[${titleCase}]\n`;
            compiledText += questionAnswers[i].trim() + '\n';
        }
    }
    
    console.log('Compiled text:', compiledText);
    finalTranscript = compiledText.trim();
    questionDisplay.style.display = 'none';
    nextQuestionBtn.style.display = 'none';
    currentQuestionIndex = 0;
    currentQuestionTranscript = '';
}
      // Recognition event handlers
recognition.onstart = () => {
    console.log('🎤 Enhanced recording started');
    isRecording = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    
    if (currentMode === 'question') {
        status.innerHTML = `🎤 Recording: ${questions[currentQuestionIndex]}`;
        // Show Next button immediately when recording starts
        nextQuestionBtn.style.display = 'inline-block';
        nextQuestionBtn.textContent = currentQuestionIndex === questions.length - 1 ? 'Finish →' : 'Next Question →';
    } else {
        status.innerHTML = '🎤 Listening... Speak naturally about the lesson';
    }
    
    status.style.background = '#cce7ff';
    liveTranscript.style.display = 'block';
    resultsSection.style.display = 'none';
    
    // Initialize timing
    window.lastSpeechTime = Date.now();
    
    // Always reset these when starting
    lastResultIndex = 0;
    lastTranscriptLength = 0;
    
    // Only reset transcript if starting fresh (not continuing in question mode)
    if (currentMode !== 'question' || currentQuestionIndex === 0 || !isRecording) {
        finalTranscript = '';
        currentQuestionTranscript = '';
    }
    lastResultIndex = 0;
    lastTranscriptLength = 0;
    
    // Start pause detection timer
    pauseCheckInterval = setInterval(() => {
        const currentTime = Date.now();
        const timeSinceLastSpeech = currentTime - window.lastSpeechTime;
        
        // If it's been more than 1.5 seconds since last speech
        if (timeSinceLastSpeech > 1500 && finalTranscript.trim()) {
            // Check if we need to add a period
            if (!/[.!?]$/.test(finalTranscript.trim())) {
                finalTranscript = finalTranscript.trim() + '. ';
                console.log('Added period due to pause');
                
                // Update display
                const liveDiv = document.getElementById('liveTranscript');
                if (liveDiv) {
                    liveDiv.innerHTML = `<strong>Live:</strong> <br><strong>Final:</strong> ${finalTranscript}`;
                }
            }
        }
    }, 200); // Check every 200ms
};
 
        
        // PAUSE-BASED PERIOD DETECTION
        // REMOVED "let lastInterimText = '';" from here - it's now at the top
        
 recognition.onresult = (event) => {
    let interim = '';
    
    // Only process NEW results since last time
    for (let i = lastResultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
            // Add the new final transcript
            let newText = transcript.trim();
            
            // Capitalize first word if this is the start of recording
            if (!finalTranscript.trim()) {
                newText = newText.charAt(0).toUpperCase() + newText.slice(1);
            }
            // Capitalize if after a period
            else if (finalTranscript.trim().endsWith('.')) {
                newText = newText.charAt(0).toUpperCase() + newText.slice(1);
            }
            
            finalTranscript += newText + ' ';
            
            // Also add to current question transcript if in question mode
            if (currentMode === 'question') {
                // Capitalize first word of each question answer
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
    
    // Update timing if we got any new content
    const currentLength = finalTranscript.length + interim.length;
    if (currentLength > lastTranscriptLength) {
        window.lastSpeechTime = Date.now();
        lastTranscriptLength = currentLength;
    }
    
    // Display the results - show only current question transcript in question mode
    if (currentMode === 'question') {
        liveTranscript.innerHTML = `<strong>Live:</strong> ${interim}<br><strong>Current Answer:</strong> ${currentQuestionTranscript}`;
    } else {
        liveTranscript.innerHTML = `<strong>Live:</strong> ${interim}<br><strong>Final:</strong> ${finalTranscript}`;
    }
    liveTranscript.scrollTop = liveTranscript.scrollHeight;
};
        
                    
 recognition.onend = () => {
    console.log('🎤 Enhanced recording ended');
    
    // Clear the pause detection timer
    if (pauseCheckInterval) {
        clearInterval(pauseCheckInterval);
        pauseCheckInterval = null;
    }
    
    isRecording = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    liveTranscript.style.display = 'none';
    nextQuestionBtn.style.display = 'none'; // Hide Next button when recording ends
    
    // Check if we're in question mode but stopped early
    // Note: currentQuestionIndex equals questions.length when all questions are answered
    if (currentMode === 'question' && currentQuestionIndex < questions.length && currentQuestionIndex > 0) {
        // User stopped recording before finishing all questions
        status.innerHTML = `Recording stopped early. Partial results shown below.`;
        status.style.background = '#fff3cd';
        
        // Save current partial answer
        if (finalTranscript.trim()) {
            questionAnswers[currentQuestionIndex] = finalTranscript.trim();
        }
        
        // Compile what we have so far
        compileQuestionResults();
        // Don't return here - let it continue to process
    }
    
    // Normal processing for both modes
    if (finalTranscript.trim()) {
        status.innerHTML = '⚙️ Applying AI enhancements...';
        status.style.background = '#fff3cd';
        
        // Store raw text
        rawText = finalTranscript.trim();
        
        // Get user selections
        const template = templateSelect ? templateSelect.value : 'general';
        
        // Apply enhanced processing
        if (window.enhancedCleanupSpeechText) {
            const result = window.enhancedCleanupSpeechText(rawText, {
                template: template
            });
            enhancedText = result.text;
            
            // Show enhancement summary
            enhancementSummary.textContent = result.enhancements || 'Professional formatting applied';
            enhancementInfo.style.display = 'block';
        } else {
            // Fallback to basic cleanup if enhanced version fails
            enhancedText = window.cleanupSpeechText ? window.cleanupSpeechText(rawText) : rawText;
            enhancementSummary.textContent = 'Basic cleanup applied';
            enhancementInfo.style.display = 'block';
        }
        
        // Store globally for radio button switching
        window.recordingResults = { 
            raw: rawText, 
            enhanced: enhancedText 
        };
        
        // Update display
        updateResultsDisplay();
        resultsSection.style.display = 'block';
        
        status.innerHTML = '✅ Professional lesson notes ready!';
        status.style.background = '#d4edda';
        
        // Reset mode after successful completion
        if (currentMode === 'question') {
            currentMode = 'freeflow';
            currentQuestionIndex = 0;
            questionAnswers = {};
        }
    } else {
        status.innerHTML = '❌ No speech detected. Please try again.';
        status.style.background = '#f8d7da';
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
                        
                        status.innerHTML = errorMsg;
                        status.style.background = '#f8d7da';
                        
                        isRecording = false;
                        startBtn.disabled = false;
                        stopBtn.disabled = true;
                        liveTranscript.style.display = 'none';
                    };
                    
                    // Button event listeners
                    startBtn.onclick = () => {
                        if (recognition && !isRecording) {
                            finalTranscript = '';
                            recognition.start();
                        }
                    };
                    
                    stopBtn.onclick = () => {
                        if (recognition && isRecording) {
                            recognition.stop();
                        }
                    };
                    
                    // Close button
                    document.getElementById('closeRecorder').onclick = () => {
                        if (recognition && isRecording) {
                            recognition.stop();
                        }
                        document.getElementById('lesson-notes-recorder').remove();
                    };
                    
                    // Enhanced copy button
                    document.getElementById('copyResults').onclick = () => {
                        // Always copy the enhanced format
                        const textToCopy = window.recordingResults.enhanced;
                        
                        navigator.clipboard.writeText(textToCopy).then(() => {
                            const copyBtn = document.getElementById('copyResults');
                            copyBtn.innerHTML = '✅ Copied!';
                            setTimeout(() => {
                                copyBtn.innerHTML = '📋 Copy Notes';
                            }, 3000);
                        }).catch(() => {
                            // Fallback for older browsers
                            const textArea = document.createElement('textarea');
                            textArea.value = textToCopy;
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                            
                            const copyBtn = document.getElementById('copyResults');
                            copyBtn.innerHTML = '✅ Copied!';
                            setTimeout(() => {
                                copyBtn.innerHTML = '📋 Copy Notes';
                            }, 3000);
                        });
                    };
                    
                    function updateResultsDisplay() {
                        if (!window.recordingResults) return;
                        
                        const output = document.getElementById('resultsOutput');
                        
                        // Convert newlines to HTML breaks and make bracketed questions bold
                        let formattedText = window.recordingResults.enhanced
                            .replace(/\n/g, '<br>')
                            .replace(/\[([^\]]+)\]/g, '<strong>[$1]</strong>');
                        output.innerHTML = formattedText;
                        enhancementInfo.style.display = 'block';
                    }
                    
                    console.log('✅ Enhanced speech recognition setup complete');
                }
            });
            
            // Step 3: Inject the enhanced text cleanup functions
            await chrome.scripting.executeScript({
                target: { tabId: await this.getCurrentTabId() },
                func: function() {
                    console.log('Injecting enhanced text cleanup functions...');
                    
                    // Enhanced cleanup function with teacher-focused structure
   // Replace the complex enhancedCleanupSpeechText function with this simpler version
window.enhancedCleanupSpeechText = function(text, options = {}) {
    if (!text || !text.trim()) return { text: text, enhancements: [] };
    
    let cleaned = text.trim();
    let enhancements = [];
    
    // Step 1: Remove filler words
    const fillerWords = [
        'um', 'uh', 'uhm', 'er', 'ah', 'like like', 'you know', 'sort of', 
        'kind of', 'i mean', 'basically', 'actually', 'so yeah', 'anyway'
    ];
    
    fillerWords.forEach(filler => {
        const regex = new RegExp('\\b' + filler + '\\b', 'gi');
        cleaned = cleaned.replace(regex, ' ');
    });
    
    // Remove repeated words
    cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');
    
    if (cleaned.length < text.length * 0.9) {
        enhancements.push('Removed filler words');
    }
    
    // Step 2: Fix common speech recognition errors
    const fixes = {
        "I'd to": "I'd like to",
        "I'd you to": "I'd like you to",
        "what I'd you": "what I'd like you",
        "going to to": "going to",
        "need to to": "need to",
        "f minuscale": "F minor scale",
        "minor scale scale": "minor scale",
        "major scale scale": "major scale",
        
                "f minuscale": "F minor scale",
                "minor scale scale": "minor scale",
                "major scale scale": "major scale",
                "f minus": "F minor",
                "not your minor": "natural minor",
                "hole tone scale": "whole tone scale",
                "sixty note": "sixteenth note",
                "six teeth note": "sixteenth note",
                "ate notes": "eighth notes",
                "ate note": "eighth note",
                "DS alcohol da": "D.S. al coda",
                "DS al coda": "D.S. al coda",
                "into fall": "interval",
                "in to veil": "interval",
                "door in mode": "Dorian mode",
                "door in": "Dorian",
                "mix a Lydian": "Mixolydian",
                "mic soul idiom": "Mixolydian",
                "cave dance": "cadence",
                
               
                "fret board": "fretboard",
                "bar chord": "barre chord",
                "bar code": "barre chord",
                "pics": "picks",
                "plec": "pick",
                "rhythm guitar": "rhythm guitar",
                "lead guitar": "lead guitar",
                "strumming pattern": "strumming pattern",
                "finger picking": "fingerpicking",
                "down stroke": "downstroke",
                "up stroke": "upstroke",

    };
    
    Object.entries(fixes).forEach(([error, fix]) => {
        cleaned = cleaned.replace(new RegExp(error, 'gi'), fix);
    });
    
    // Step 3: Enhanced capitalization
    // More robust first letter capitalization - handles leading whitespace
    cleaned = cleaned.replace(/^\s*([a-z])/, (match, letter) => 
        match.replace(letter, letter.toUpperCase()));
    
    // Capitalize after periods (existing logic)
    cleaned = cleaned.replace(/\.\s+([a-z])/g, (match, letter) => '. ' + letter.toUpperCase());
    
    // Step 4: Light professional tone (just the worst offenders)
    cleaned = cleaned.replace(/\bgonna\b/gi, 'going to');
    cleaned = cleaned.replace(/\bwanna\b/gi, 'want to');
    cleaned = cleaned.replace(/\bgotta\b/gi, 'need to');
    
    // Step 5: Clean up spacing but PRESERVE newlines and markdown formatting
    // Only replace multiple spaces/tabs, but preserve newlines and ** formatting
    cleaned = cleaned.replace(/[ \t]+/g, ' ').trim();
    if (!/[.!?]$/.test(cleaned)) {
        cleaned += '.';
    }
    
    // Remove any double periods from our pause detection
    cleaned = cleaned.replace(/\.\.+/g, '.');
    
    // Fix spacing around periods but preserve newlines and markdown
    cleaned = cleaned.replace(/\s*\.\s*/g, (match) => {
        return match.includes('\n') ? '.\n' : '. ';
    }).trim();
    
    if (cleaned !== text) {
        enhancements.push('Grammar and clarity improved');
    }
    
    return {
        text: cleaned,
        enhancements: enhancements.join(', ')
    };
     };

                    
                    // Keep your original function as backup
                    window.cleanupSpeechText = function(text) {
                        return window.enhancedCleanupSpeechText(text).text;
                    };
                    
                    console.log('✅ Enhanced text cleanup functions injected');
                }
            });
            
            console.log('✅ Enhanced recorder components injected');
            this.showStatus('✅ Recorder created! This popup will close automatically...', 'success');
            
            // Auto-close the extension popup after a brief delay to avoid interference
            setTimeout(() => {
                if (window.close) {
                    console.log('🔄 Auto-closing extension popup to prevent interference');
                    window.close();
                }
            }, 800); // Quicker close - just enough time to see success message
            
        } catch (error) {
            console.error('❌ Enhanced injection error:', error);
            this.showStatus(`Error: ${error.message}. Try refreshing the page.`, 'error');
        }
    }
    
    async getCurrentTabId() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('No active tab');
        if (tab.url.startsWith('chrome://')) throw new Error('Cannot record on Chrome pages');
        return tab.id;
    }
    
    displayResults(structuredNotes) {
        this.outputBox.textContent = structuredNotes;
        this.outputSection.classList.add('show');
    }
    
    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.outputBox.textContent);
            this.copyBtn.textContent = '✅ Copied!';
            setTimeout(() => {
                this.copyBtn.textContent = 'Copy Notes';
            }, 2000);
        } catch (error) {
            const textArea = document.createElement('textarea');
            textArea.value = this.outputBox.textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.copyBtn.textContent = '✅ Copied!';
            setTimeout(() => {
                this.copyBtn.textContent = 'Copy Notes';
            }, 2000);
        }
    }
    
    async resetForNewRecording() {
        this.outputSection.classList.remove('show');
        this.hideStatus();
        
        try {
            await chrome.storage.local.remove(['lastRecordingResult']);
            console.log('🗑️ Cleared stored results');
        } catch (error) {
            console.error('Error clearing stored results:', error);
        }
    }
    
    showStatus(message, type) {
        console.log(`Status [${type}]: ${message}`);
        this.status.textContent = message;
        this.status.className = `status ${type}`;
        this.status.style.display = 'block';
    }
    
    hideStatus() {
        this.status.style.display = 'none';
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Enhanced Popup DOM loaded, initializing...');
    new LessonNotesManager();
});
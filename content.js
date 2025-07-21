// Content script for Music Lesson Notes Extension
// Note: This file is optional - the extension currently uses chrome.scripting.executeScript
// But you can use this for future features or alternative injection methods

console.log('🎵 Lesson Notes content script loaded on:', window.location.href);

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Content script received message:', request);
    
    if (request.action === 'createRecorder') {
        createLessonRecorder(request.template);
        sendResponse({ success: true });
    }
    
    if (request.action === 'removeRecorder') {
        removeLessonRecorder();
        sendResponse({ success: true });
    }
    
    return true; // Keep message channel open
});

// Function to create the lesson recorder (alternative to injection)
function createLessonRecorder(template) {
    console.log('Creating lesson recorder with template:', template);
    
    // Remove existing recorder
    removeLessonRecorder();
    
    // This would be an alternative way to create the recorder
    // instead of using chrome.scripting.executeScript
    // You can uncomment and modify this if you prefer content script approach
    
    /*
    const recorder = document.createElement('div');
    recorder.id = 'lesson-notes-recorder';
    recorder.innerHTML = `
        <!-- Recorder HTML here -->
    `;
    document.body.appendChild(recorder);
    
    // Set up speech recognition here
    setupSpeechRecognition(template);
    */
}

// Function to remove the recorder
function removeLessonRecorder() {
    const existing = document.getElementById('lesson-notes-recorder');
    if (existing) {
        existing.remove();
        console.log('🗑️ Removed existing recorder');
    }
}

// Check if we're on a compatible page
function isCompatiblePage() {
    // Don't run on chrome:// pages or extension pages
    return !window.location.href.startsWith('chrome://') && 
           !window.location.href.startsWith('chrome-extension://') &&
           !window.location.href.startsWith('moz-extension://');
}

// Optional: Auto-setup if needed
if (isCompatiblePage()) {
    console.log('✅ Page is compatible with lesson recorder');
} else {
    console.log('❌ Page not compatible with lesson recorder');
}
// Background script for Music Lesson Notes Extension
console.log('🚀 Background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details.reason);
    
    if (details.reason === 'install') {
        console.log('🎵 Music Lesson Notes Assistant installed successfully!');
    }
});

// Optional: Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Background received message:', request);
    
    if (request.action === 'saveRecording') {
        // Store recording results
        chrome.storage.local.set({
            lastRecordingResult: {
                text: request.text,
                timestamp: Date.now(),
                template: request.template,
                source: 'speech'
            }
        }).then(() => {
            console.log('✅ Recording saved to storage');
            sendResponse({ success: true });
        }).catch((error) => {
            console.error('❌ Failed to save recording:', error);
            sendResponse({ success: false, error: error.message });
        });
        
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'getStoredResult') {
        chrome.storage.local.get(['lastRecordingResult']).then((result) => {
            sendResponse(result);
        }).catch((error) => {
            console.error('❌ Failed to get stored result:', error);
            sendResponse({ error: error.message });
        });
        
        return true; // Keep message channel open for async response
    }
});

// Optional: Clean up old recordings periodically
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanupOldRecordings') {
        console.log('🧹 Cleaning up old recordings...');
        
        chrome.storage.local.get(['lastRecordingResult']).then((result) => {
            if (result.lastRecordingResult) {
                const ageInHours = (Date.now() - result.lastRecordingResult.timestamp) / (1000 * 60 * 60);
                
                // Remove recordings older than 24 hours
                if (ageInHours > 24) {
                    chrome.storage.local.remove(['lastRecordingResult']);
                    console.log('🗑️ Removed old recording');
                }
            }
        });
    }
});

// Set up periodic cleanup (every 6 hours)
chrome.alarms.create('cleanupOldRecordings', {
    delayInMinutes: 1, // Start after 1 minute
    periodInMinutes: 360 // Repeat every 6 hours
});
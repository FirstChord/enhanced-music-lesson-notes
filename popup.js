// Enhanced Music Lesson Notes Extension - popup.js
// Updated version with content script integration

class LessonNotesManager {
    constructor() {
        console.log('🚀 Enhanced Extension initializing...');
        
        // Initialize enhanced text processor settings
        this.processorConfig = {
            schoolName: 'Your Music School',
            defaultInstrument: 'general',
            outputFormat: 'mymusicstaff'
        };
        
        this.initializeElements();
        this.bindEvents();
        this.checkPermissions();
        this.setupMessageListener();
    }
    
    initializeElements() {
        this.pageRecordBtn = document.getElementById('pageRecordBtn');
        this.tutorialBtn = document.getElementById('tutorialBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.newBtn = document.getElementById('newBtn');
        this.outputSection = document.getElementById('outputSection');
        this.outputBox = document.getElementById('outputBox');
        this.status = document.getElementById('status');
        this.cloudASR = document.getElementById('cloudASR');
        this.browserASR = document.getElementById('browserASR');
        
        console.log('✅ Elements initialized');
        
        // Load ASR mode from storage
        this.loadASRMode();
    }
    
    async checkPermissions() {
        console.log('🔍 Checking permissions...');
        
        try {
            if (typeof chrome !== 'undefined' && chrome.scripting) {
                console.log('✅ chrome.scripting available');
                // Ready - no status message needed
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
        
        this.tutorialBtn.addEventListener('click', () => {
            console.log('📹 Tutorial button clicked');
            this.openTutorial();
        });
        
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.newBtn.addEventListener('click', () => this.resetForNewRecording());
        
        // ASR mode change listeners
        this.cloudASR.addEventListener('change', () => this.saveASRMode('cloud'));
        this.browserASR.addEventListener('change', () => this.saveASRMode('browser'));
        
        console.log('✅ Events bound');
    }
    
    async startPageRecording() {
        console.log('🚀 Starting enhanced page recording via content script...');
        
        try {
            this.showStatus('Injecting content script...', 'info');
            
            const tabId = await this.getCurrentTabId();
            
            // First inject the textProcessor.js file
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['textProcessor.js']
            });
            
            // Then inject the content script to ensure it's available
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content.js']
            });
            
            this.showStatus('Connecting to content script...', 'info');
            
            // Give a small delay to ensure content script is ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Get current ASR mode
            const asrMode = await this.getASRMode();
            
            // Send message to content script to start recording
            const response = await chrome.tabs.sendMessage(tabId, {
                action: 'startRecording',
                template: 'general',
                asrMode: asrMode
            });
            
            if (response && response.success) {
                this.showStatus('Recording started successfully!', 'success');
                console.log('✅ Recording started via content script');
                
                // Auto-close the popup after successful start
                setTimeout(() => {
                    window.close();
                }, 500);
                
            } else {
                throw new Error(response?.error || 'Failed to start recording');
            }
            
        } catch (error) {
            console.error('❌ Error starting recording:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
            
            if (error.message.includes('Could not establish connection')) {
                this.showStatus('Content script injection failed. Please ensure you\'re on a valid webpage and try again.', 'error');
            }
        }
    }
    
    // Add message listener to handle responses from content script
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'recordingComplete') {
                console.log('📝 Recording completed:', message.data);
                
                // Display results in popup if needed
                this.displayResults(message.data.enhanced);
                this.showStatus('Recording completed successfully!', 'success');
                
                sendResponse({ success: true });
            }
        });
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
        console.log('📋 Copying to clipboard...');
        
        if (!this.outputBox.textContent) {
            this.showStatus('No content to copy', 'warning');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(this.outputBox.textContent);
            this.showStatus('✅ Copied to clipboard!', 'success');
            
            // Visual feedback
            this.copyBtn.innerHTML = '✅ Copied!';
            setTimeout(() => {
                this.copyBtn.innerHTML = '📋 Copy';
            }, 3000);
            
        } catch (error) {
            console.error('Copy failed:', error);
            
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = this.outputBox.textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.showStatus('✅ Copied to clipboard (fallback)!', 'success');
        }
    }
    
    async resetForNewRecording() {
        console.log('🔄 Resetting for new recording...');
        
        this.outputBox.textContent = '';
        this.outputSection.classList.remove('show');
        this.showStatus('Ready for new recording', 'info');
        
        // Reset button text
        this.copyBtn.innerHTML = '📋 Copy';
        
        console.log('✅ Reset complete');
    }
    
    openTutorial() {
        console.log('📹 Opening tutorial...');
        
        // TODO: Replace with actual tutorial URL when video is ready
        const tutorialUrl = 'https://youtu.be/YOUR_VIDEO_ID_HERE';
        
        // Open in a new tab
        chrome.tabs.create({
            url: tutorialUrl,
            active: true
        });
        
        console.log('✅ Tutorial opened in new tab');
    }
    
    showStatus(message, type = 'info') {
        if (!this.status) return;
        
        this.status.textContent = message;
        this.status.className = `status ${type}`;
        this.status.style.display = 'block';
    }
    
    hideStatus() {
        this.status.style.display = 'none';
    }
    
    // ASR mode management methods
    async loadASRMode() {
        try {
            const result = await chrome.storage.sync.get('asrMode');
            const asrMode = result.asrMode || 'cloud';
            
            if (asrMode === 'cloud') {
                this.cloudASR.checked = true;
            } else {
                this.browserASR.checked = true;
            }
            
            console.log('✅ Loaded ASR mode:', asrMode);
        } catch (error) {
            console.error('❌ Failed to load ASR mode:', error);
            // Default to cloud
            this.cloudASR.checked = true;
        }
    }
    
    async saveASRMode(mode) {
        try {
            await chrome.storage.sync.set({ asrMode: mode });
            console.log('✅ Saved ASR mode:', mode);
        } catch (error) {
            console.error('❌ Failed to save ASR mode:', error);
        }
    }
    
    async getASRMode() {
        try {
            const result = await chrome.storage.sync.get('asrMode');
            return result.asrMode || 'cloud';
        } catch (error) {
            console.error('❌ Failed to get ASR mode:', error);
            return 'cloud';
        }
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Enhanced Popup DOM loaded, initializing...');
    new LessonNotesManager();
});

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
        console.log('🚀 Starting enhanced page recording via content script...');
        
        try {
            this.showStatus('Connecting to content script...', 'info');
            
            const tabId = await this.getCurrentTabId();
            
            // First inject the textProcessor.js file
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['textProcessor.js']
            });
            
            // Send message to content script to start recording
            const response = await chrome.tabs.sendMessage(tabId, {
                action: 'startRecording',
                template: 'general'
            });
            
            if (response && response.success) {
                this.showStatus('Recording started successfully!', 'success');
                console.log('✅ Recording started via content script');
            } else {
                throw new Error(response?.error || 'Failed to start recording');
            }
            
        } catch (error) {
            console.error('❌ Error starting recording:', error);
            this.showStatus(`Error: ${error.message}`, 'error');
            
            if (error.message.includes('Could not establish connection')) {
                this.showStatus('Content script not loaded. Please refresh the page and try again.', 'error');
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
    
    showStatus(message, type = 'info') {
        if (!this.status) return;
        
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

// Enhanced Music Lesson Notes Extension - Text Processor Module
// Handles text cleanup and enhancement for speech recognition output

/**
 * Music-specific terminology corrections
 */
const MUSIC_TERMINOLOGY_FIXES = {
    // Grammar fixes
    "I'd to": "I'd like to",
    "I'd you to": "I'd like you to",
    "what I'd you": "what I'd like you",
    "going to to": "going to",
    "need to to": "need to",
    
    // Scale corrections
    "f minuscale": "F minor scale",
    "minor scale scale": "minor scale",
    "major scale scale": "major scale",
    "f minus": "F minor",
    "not your minor": "natural minor",
    "hole tone scale": "whole tone scale",
    
    // Note corrections
    "sixty note": "sixteenth note",
    "six teeth note": "sixteenth note",
    "ate notes": "eighth notes",
    "ate note": "eighth note",
    
    // Musical terms
    "DS alcohol da": "D.S. al coda",
    "DS al coda": "D.S. al coda",
    "into fall": "interval",
    "in to veil": "interval",
    "door in mode": "Dorian mode",
    "door in": "Dorian",
    "mix a Lydian": "Mixolydian",
    "mic soul idiom": "Mixolydian",
    "cave dance": "cadence",
    
    // Guitar-specific terms
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
    "up stroke": "upstroke"
};

/**
 * Common filler words to remove from speech
 */
const FILLER_WORDS = [
    'um', 'uh', 'uhm', 'er', 'ah', 'like like', 'you know', 'sort of', 
    'kind of', 'i mean', 'basically', 'actually', 'so yeah', 'anyway'
];

/**
 * Enhanced text cleanup function with teacher-focused structure
 * @param {string} text - The raw speech text to clean
 * @param {Object} options - Configuration options
 * @returns {Object} - { text: cleanedText, enhancements: enhancementsList }
 */
function enhancedCleanupSpeechText(text, options = {}) {
    if (!text || !text.trim()) return { text: text, enhancements: [] };
    
    let cleaned = text.trim();
    let enhancements = [];
    
    try {
        // Step 1: Remove filler words
        FILLER_WORDS.forEach(filler => {
            const regex = new RegExp('\\b' + filler + '\\b', 'gi');
            cleaned = cleaned.replace(regex, ' ');
        });
        
        // Remove repeated words
        cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');
        
        if (cleaned.length < text.length * 0.9) {
            enhancements.push('Removed filler words');
        }
        
        // Step 2: Fix common speech recognition errors
        Object.entries(MUSIC_TERMINOLOGY_FIXES).forEach(([error, fix]) => {
            cleaned = cleaned.replace(new RegExp(error, 'gi'), fix);
        });
        
        // Step 3: Enhanced capitalization
        // More robust first letter capitalization - handles leading whitespace
        cleaned = cleaned.replace(/^\s*([a-z])/, (match, letter) => 
            match.replace(letter, letter.toUpperCase()));
        
        // Capitalize after periods
        cleaned = cleaned.replace(/\.\s+([a-z])/g, (match, letter) => '. ' + letter.toUpperCase());
        
        // Step 4: Light professional tone improvements
        cleaned = cleaned.replace(/\bgonna\b/gi, 'going to');
        cleaned = cleaned.replace(/\bwanna\b/gi, 'want to');
        cleaned = cleaned.replace(/\bgotta\b/gi, 'need to');
        
        // Step 5: Clean up spacing but PRESERVE newlines and formatting
        // Only replace multiple spaces/tabs, but preserve newlines
        cleaned = cleaned.replace(/[ \t]+/g, ' ').trim();
        if (!/[.!?]$/.test(cleaned)) {
            cleaned += '.';
        }
        
        // Remove any double periods from pause detection
        cleaned = cleaned.replace(/\.\.+/g, '.');
        
        // Fix spacing around periods but preserve newlines
        cleaned = cleaned.replace(/\s*\.\s*/g, (match) => {
            return match.includes('\n') ? '.\n' : '. ';
        }).trim();
        
        if (cleaned !== text) {
            enhancements.push('Grammar and clarity improved');
        }
        
    } catch (error) {
        console.error('Text cleanup error:', error);
        // Return original text if cleanup fails
        return { text: text, enhancements: ['Cleanup failed, using original text'] };
    }
    
    return {
        text: cleaned,
        enhancements: enhancements.join(', ')
    };
}

/**
 * Basic cleanup function (for backwards compatibility)
 * @param {string} text - The raw speech text to clean
 * @returns {string} - Cleaned text
 */
function cleanupSpeechText(text) {
    try {
        return enhancedCleanupSpeechText(text).text;
    } catch (error) {
        console.error('Basic cleanup error:', error);
        return text; // Return original if cleanup fails
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        enhancedCleanupSpeechText,
        cleanupSpeechText,
        MUSIC_TERMINOLOGY_FIXES,
        FILLER_WORDS
    };
} else if (typeof window !== 'undefined') {
    // Browser environment - attach to window
    window.enhancedCleanupSpeechText = enhancedCleanupSpeechText;
    window.cleanupSpeechText = cleanupSpeechText;
}

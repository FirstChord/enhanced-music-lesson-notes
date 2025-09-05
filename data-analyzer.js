/**
 * Music Lesson Notes Data Analyzer
 * Analyzes homework notes from API to improve speech recognition accuracy
 */

const fs = require('fs').promises;
const path = require('path');

class NotesDataAnalyzer {
    constructor(apiKey, baseUrl) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.patterns = new Map();
        this.corrections = new Map();
        this.instrumentContext = new Map();
        this.songTitles = new Set();
        this.commonErrors = new Map();
    }

    /**
     * Fetch notes from the API
     */
    async fetchNotes(endpoint = '/notes', limit = 1000) {
        try {
            // Properly construct URL
            let baseUrl = this.baseUrl;
            if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
                baseUrl = `https://${baseUrl}`;
            }
            
            // Remove trailing slash from baseUrl and leading slash from endpoint if both exist
            baseUrl = baseUrl.replace(/\/$/, '');
            endpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            
            const url = new URL(`${baseUrl}${endpoint}`);
            url.searchParams.append('limit', limit.toString());
            
            console.log(`🔗 Fetching from: ${url.toString()}`);
            
            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`📊 Fetched ${data.length || data.notes?.length || 0} notes from API`);
            return data.notes || data || [];
        } catch (error) {
            console.error('❌ Failed to fetch notes:', error.message);
            throw error;
        }
    }

    /**
     * Analyze text patterns to identify potential speech recognition errors
     */
    analyzeTextPatterns(notes) {
        console.log('🔍 Analyzing text patterns...');
        
        const potentialErrors = new Map();
        const instrumentKeywords = {
            piano: ['piano', 'keys', 'pedal', 'chord', 'scale', 'fingering', 'dynamics'],
            guitar: ['guitar', 'fret', 'string', 'pick', 'strum', 'capo', 'barre', 'chord'],
            general: ['tempo', 'rhythm', 'melody', 'harmony', 'beat', 'measure', 'practice']
        };

        notes.forEach((note, index) => {
            const text = this.extractTextFromNote(note);
            if (!text) return;

            // Detect instrument context
            const instruments = this.detectInstrumentContext(text, instrumentKeywords);
            
            // Find potential speech recognition errors
            this.findPotentialErrors(text, potentialErrors);
            
            // Extract song titles and artist names
            this.extractSongInfo(text);
            
            // Analyze common phrases and structures
            this.analyzeCommonPhrases(text);

            if (index % 100 === 0) {
                console.log(`   Processed ${index + 1}/${notes.length} notes...`);
            }
        });

        console.log(`✅ Analysis complete! Found ${potentialErrors.size} potential error patterns`);
        return potentialErrors;
    }

    /**
     * Extract text content from note object (flexible for different API structures)
     */
    extractTextFromNote(note) {
        // Handle different possible note structures
        return note.content || note.text || note.body || note.notes || note.description || '';
    }

    /**
     * Detect which instrument(s) are being discussed
     */
    detectInstrumentContext(text, instrumentKeywords) {
        const detected = [];
        const lowerText = text.toLowerCase();

        for (const [instrument, keywords] of Object.entries(instrumentKeywords)) {
            const matches = keywords.filter(keyword => lowerText.includes(keyword));
            if (matches.length > 0) {
                detected.push(instrument);
                this.instrumentContext.set(instrument, (this.instrumentContext.get(instrument) || 0) + 1);
            }
        }

        return detected;
    }

    /**
     * Find potential speech recognition errors using common patterns
     */
    findPotentialErrors(text, potentialErrors) {
        // Common speech recognition error patterns
        const errorPatterns = [
            // Musical terms that get misheard
            { wrong: /\bcords\b/gi, right: 'chords' },
            { wrong: /\bpeace\b/gi, right: 'piece', context: ['music', 'song', 'play'] },
            { wrong: /\bscales?\b/gi, right: 'scales', context: ['practice', 'finger', 'exercise'] },
            { wrong: /\bsales\b/gi, right: 'scales', context: ['music', 'practice'] },
            { wrong: /\bno\b/gi, right: 'note', context: ['whole', 'quarter', 'eighth'] },
            { wrong: /\bnotes?\b/gi, right: 'notes' },
            { wrong: /\bbase\b/gi, right: 'bass', context: ['clef', 'line', 'guitar'] },
            { wrong: /\btreble cleft\b/gi, right: 'treble clef' },
            { wrong: /\bminer\b/gi, right: 'minor', context: ['scale', 'chord', 'key'] },
            { wrong: /\bmajor\b/gi, right: 'major' },
            { wrong: /\btemp\b/gi, right: 'tempo', context: ['slow', 'fast', 'speed'] },
            { wrong: /\brhythm guitar\b/gi, right: 'rhythm guitar' },
            { wrong: /\blead guitar\b/gi, right: 'lead guitar' },
            { wrong: /\bfinger board\b/gi, right: 'fretboard' },
            { wrong: /\bbar chord\b/gi, right: 'barre chord' },
            { wrong: /\bpeddle\b/gi, right: 'pedal' },
            { wrong: /\bsustainn?\b/gi, right: 'sustain' },
            { wrong: /\blegatto\b/gi, right: 'legato' },
            { wrong: /\bstaccatto\b/gi, right: 'staccato' }
        ];

        errorPatterns.forEach(pattern => {
            const matches = text.match(pattern.wrong);
            if (matches) {
                // Check context if specified
                if (pattern.context) {
                    const hasContext = pattern.context.some(ctx => 
                        text.toLowerCase().includes(ctx.toLowerCase())
                    );
                    if (!hasContext) return;
                }

                const key = matches[0].toLowerCase();
                potentialErrors.set(key, {
                    wrong: key,
                    right: pattern.right,
                    frequency: (potentialErrors.get(key)?.frequency || 0) + matches.length,
                    examples: [...(potentialErrors.get(key)?.examples || []), text.substring(0, 100)]
                });
            }
        });
    }

    /**
     * Extract song titles and artist names
     */
    extractSongInfo(text) {
        // Common patterns for song titles in lesson notes
        const songPatterns = [
            /"([^"]+)"/g,  // Quoted titles
            /playing ([A-Z][^.!?]*)/g,  // "playing Song Title"
            /worked on ([A-Z][^.!?]*)/g,  // "worked on Song Title"
            /practicing ([A-Z][^.!?]*)/g,  // "practicing Song Title"
            /song called ([^.!?]+)/gi,  // "song called ..."
            /piece called ([^.!?]+)/gi   // "piece called ..."
        ];

        songPatterns.forEach(pattern => {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                if (match[1] && match[1].length > 3 && match[1].length < 50) {
                    this.songTitles.add(match[1].trim());
                }
            }
        });
    }

    /**
     * Analyze common phrases teachers use
     */
    analyzeCommonPhrases(text) {
        // Track common teaching phrases for context understanding
        const phrases = [
            'needs to work on',
            'did well with',
            'struggled with',
            'homework for next week',
            'practice daily',
            'use the metronome',
            'slow it down',
            'pay attention to',
            'remember to',
            'next lesson'
        ];

        phrases.forEach(phrase => {
            if (text.toLowerCase().includes(phrase)) {
                this.patterns.set(phrase, (this.patterns.get(phrase) || 0) + 1);
            }
        });
    }

    /**
     * Generate improved correction dictionary
     */
    generateCorrectionDictionary(potentialErrors) {
        console.log('📝 Generating correction dictionary...');
        
        const corrections = {};
        
        // Add high-frequency errors (appeared 3+ times)
        for (const [key, data] of potentialErrors.entries()) {
            if (data.frequency >= 3) {
                corrections[key] = data.right;
            }
        }

        // Add instrument-specific corrections
        if (this.instrumentContext.get('piano') > 10) {
            Object.assign(corrections, {
                'peddle': 'pedal',
                'sustane': 'sustain',
                'dinamics': 'dynamics',
                'forta': 'forte',
                'pieno': 'piano',
                'legatto': 'legato',
                'staccatto': 'staccato'
            });
        }

        if (this.instrumentContext.get('guitar') > 10) {
            Object.assign(corrections, {
                'fret board': 'fretboard',
                'bar chord': 'barre chord',
                'pics': 'picks',
                'capo': 'capo',
                'finger picking': 'fingerpicking',
                'down stroke': 'downstroke',
                'up stroke': 'upstroke',
                'palm muting': 'palm muting'
            });
        }

        console.log(`✅ Generated ${Object.keys(corrections).length} corrections`);
        return corrections;
    }

    /**
     * Update the textProcessor.js file with new corrections
     */
    async updateTextProcessor(corrections) {
        try {
            const textProcessorPath = path.join(__dirname, 'textProcessor.js');
            let content = await fs.readFile(textProcessorPath, 'utf8');

            // Find the MUSIC_TERMINOLOGY_FIXES object
            const startPattern = /const MUSIC_TERMINOLOGY_FIXES = \{/;
            const endPattern = /\};/;

            const startMatch = content.match(startPattern);
            if (!startMatch) {
                throw new Error('Could not find MUSIC_TERMINOLOGY_FIXES in textProcessor.js');
            }

            // Build new corrections object
            const existingCorrections = this.extractExistingCorrections(content);
            const mergedCorrections = { ...existingCorrections, ...corrections };

            // Generate new corrections string
            const correctionsString = this.formatCorrections(mergedCorrections);

            // Replace the corrections object
            const newContent = content.replace(
                /const MUSIC_TERMINOLOGY_FIXES = \{[\s\S]*?\};/,
                `const MUSIC_TERMINOLOGY_FIXES = ${correctionsString};`
            );

            // Backup original file
            await fs.writeFile(`${textProcessorPath}.backup`, content);
            
            // Write updated file
            await fs.writeFile(textProcessorPath, newContent);

            console.log('✅ Updated textProcessor.js with new corrections');
            console.log(`📄 Backup saved as textProcessor.js.backup`);

        } catch (error) {
            console.error('❌ Failed to update textProcessor.js:', error.message);
            throw error;
        }
    }

    /**
     * Extract existing corrections from textProcessor.js
     */
    extractExistingCorrections(content) {
        const match = content.match(/const MUSIC_TERMINOLOGY_FIXES = \{([\s\S]*?)\};/);
        if (!match) return {};

        try {
            // Parse the existing corrections object
            const objectString = `{${match[1]}}`;
            return eval(`(${objectString})`);
        } catch (error) {
            console.warn('Could not parse existing corrections, starting fresh');
            return {};
        }
    }

    /**
     * Format corrections object for writing to file
     */
    formatCorrections(corrections) {
        const entries = Object.entries(corrections).map(([key, value]) => {
            return `    "${key}": "${value}"`;
        });

        return `{\n${entries.join(',\n')}\n}`;
    }

    /**
     * Generate analysis report
     */
    generateReport(potentialErrors, corrections) {
        const report = {
            timestamp: new Date().toISOString(),
            totalPatterns: potentialErrors.size,
            totalCorrections: Object.keys(corrections).length,
            instrumentDistribution: Object.fromEntries(this.instrumentContext),
            topErrors: Array.from(potentialErrors.entries())
                .sort((a, b) => b[1].frequency - a[1].frequency)
                .slice(0, 10)
                .map(([key, data]) => ({ error: key, frequency: data.frequency, correction: data.right })),
            songTitles: Array.from(this.songTitles).slice(0, 20),
            commonPhrases: Array.from(this.patterns.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([phrase, count]) => ({ phrase, count }))
        };

        return report;
    }

    /**
     * Main analysis function
     */
    async analyze() {
        try {
            console.log('🚀 Starting notes analysis...');
            
            // Fetch notes from API
            const notes = await this.fetchNotes();
            
            if (!notes || notes.length === 0) {
                throw new Error('No notes found from API');
            }

            // Analyze patterns
            const potentialErrors = this.analyzeTextPatterns(notes);
            
            // Generate corrections
            const corrections = this.generateCorrectionDictionary(potentialErrors);
            
            // Update text processor
            await this.updateTextProcessor(corrections);
            
            // Generate report
            const report = this.generateReport(potentialErrors, corrections);
            
            // Save report
            await fs.writeFile(
                path.join(__dirname, 'analysis-report.json'),
                JSON.stringify(report, null, 2)
            );

            console.log('📊 Analysis Report:');
            console.log(`   Total notes analyzed: ${notes.length}`);
            console.log(`   Potential errors found: ${potentialErrors.size}`);
            console.log(`   Corrections added: ${Object.keys(corrections).length}`);
            console.log(`   Most common instrument: ${Object.entries(this.instrumentContext).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Unknown'}`);
            console.log(`   Song titles found: ${this.songTitles.size}`);
            console.log('\n✅ Analysis complete! Check analysis-report.json for full details.');

            return report;

        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            throw error;
        }
    }
}

module.exports = NotesDataAnalyzer;

// If run directly from command line
if (require.main === module) {
    console.log('🎵 Music Lesson Notes Data Analyzer');
    console.log('Usage: node data-analyzer.js');
    console.log('Make sure to set API_KEY and BASE_URL environment variables');
    console.log('Or use the interactive setup script: node setup-analyzer.js');
}

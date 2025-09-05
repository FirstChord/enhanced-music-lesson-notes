/**
 * Manual Data Import Tool for Music Lesson Notes
 * For when API access isn't available - works with exported files
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class ManualDataAnalyzer {
    constructor() {
        this.patterns = new Map();
        this.corrections = new Map();
        this.instrumentContext = new Map();
        this.songTitles = new Set();
    }

    /**
     * Process notes from various file formats
     */
    async processFromFile(filePath) {
        console.log(`📄 Processing file: ${filePath}`);
        
        const ext = path.extname(filePath).toLowerCase();
        let content;
        
        try {
            content = await fs.readFile(filePath, 'utf8');
        } catch (error) {
            throw new Error(`Could not read file: ${error.message}`);
        }

        let notes = [];
        
        switch (ext) {
            case '.json':
                notes = this.parseJSON(content);
                break;
            case '.csv':
                notes = this.parseCSV(content);
                break;
            case '.txt':
                notes = this.parseTextFile(content);
                break;
            default:
                throw new Error(`Unsupported file format: ${ext}`);
        }

        console.log(`✅ Found ${notes.length} notes to analyze`);
        return notes;
    }

    /**
     * Parse JSON exports
     */
    parseJSON(content) {
        try {
            const data = JSON.parse(content);
            
            // Handle different JSON structures
            if (Array.isArray(data)) {
                return data;
            } else if (data.notes) {
                return data.notes;
            } else if (data.lessons) {
                return data.lessons;
            } else if (data.entries) {
                return data.entries;
            } else {
                // Single object, wrap in array
                return [data];
            }
        } catch (error) {
            throw new Error(`Invalid JSON format: ${error.message}`);
        }
    }

    /**
     * Parse CSV exports (common for MyMusicStaff exports)
     */
    parseCSV(content) {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV file must have at least a header and one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const notes = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length !== headers.length) continue;

            const note = {};
            headers.forEach((header, index) => {
                note[header.toLowerCase()] = values[index];
            });

            // Extract text content from common column names
            const textContent = this.extractTextFromCSVRow(note);
            if (textContent) {
                notes.push({ content: textContent, ...note });
            }
        }

        return notes;
    }

    /**
     * Parse CSV line handling quoted values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    /**
     * Extract text content from CSV row
     */
    extractTextFromCSVRow(row) {
        const textFields = [
            'notes', 'lesson notes', 'homework', 'assignment',
            'summary', 'description', 'content', 'details',
            'practice notes', 'teacher notes', 'comments'
        ];

        for (const field of textFields) {
            if (row[field] && row[field].trim()) {
                return row[field].trim();
            }
        }

        return null;
    }

    /**
     * Parse plain text files (one note per line or paragraph)
     */
    parseTextFile(content) {
        // Split by double newlines (paragraphs) or single newlines
        let notes = content.split(/\n\s*\n/).filter(note => note.trim());
        
        if (notes.length === 1) {
            // Try splitting by single newlines if no paragraphs found
            notes = content.split('\n').filter(note => note.trim());
        }

        return notes.map(note => ({ content: note.trim() }));
    }

    /**
     * Analyze the imported notes (same logic as API analyzer)
     */
    async analyzeNotes(notes) {
        console.log('🔍 Analyzing imported notes...');
        
        const potentialErrors = new Map();
        
        notes.forEach((note, index) => {
            const text = note.content || note.text || note.notes || note.description || '';
            if (!text) return;

            // Use the same analysis logic from the API analyzer
            this.findPotentialErrors(text, potentialErrors);
            this.detectInstrumentContext(text);
            this.extractSongInfo(text);

            if (index % 50 === 0) {
                console.log(`   Processed ${index + 1}/${notes.length} notes...`);
            }
        });

        console.log(`✅ Analysis complete! Found ${potentialErrors.size} potential error patterns`);
        return potentialErrors;
    }

    /**
     * Same error detection logic as API analyzer
     */
    findPotentialErrors(text, potentialErrors) {
        const errorPatterns = [
            { wrong: /\bcords\b/gi, right: 'chords' },
            { wrong: /\bpeace\b/gi, right: 'piece', context: ['music', 'song', 'play'] },
            { wrong: /\bscales?\b/gi, right: 'scales', context: ['practice', 'finger', 'exercise'] },
            { wrong: /\bsales\b/gi, right: 'scales', context: ['music', 'practice'] },
            { wrong: /\bno\b/gi, right: 'note', context: ['whole', 'quarter', 'eighth'] },
            { wrong: /\bbase\b/gi, right: 'bass', context: ['clef', 'line', 'guitar'] },
            { wrong: /\btreble cleft\b/gi, right: 'treble clef' },
            { wrong: /\bminer\b/gi, right: 'minor', context: ['scale', 'chord', 'key'] },
            { wrong: /\btemp\b/gi, right: 'tempo', context: ['slow', 'fast', 'speed'] },
            { wrong: /\bfinger board\b/gi, right: 'fretboard' },
            { wrong: /\bbar chord\b/gi, right: 'barre chord' },
            { wrong: /\bpeddle\b/gi, right: 'pedal' }
        ];

        errorPatterns.forEach(pattern => {
            const matches = text.match(pattern.wrong);
            if (matches) {
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
     * Detect instrument context
     */
    detectInstrumentContext(text) {
        const instrumentKeywords = {
            piano: ['piano', 'keys', 'pedal', 'chord', 'scale', 'fingering', 'dynamics'],
            guitar: ['guitar', 'fret', 'string', 'pick', 'strum', 'capo', 'barre', 'chord'],
            general: ['tempo', 'rhythm', 'melody', 'harmony', 'beat', 'measure', 'practice']
        };

        const lowerText = text.toLowerCase();
        for (const [instrument, keywords] of Object.entries(instrumentKeywords)) {
            const matches = keywords.filter(keyword => lowerText.includes(keyword));
            if (matches.length > 0) {
                this.instrumentContext.set(instrument, (this.instrumentContext.get(instrument) || 0) + 1);
            }
        }
    }

    /**
     * Extract song information
     */
    extractSongInfo(text) {
        const songPatterns = [
            /"([^"]+)"/g,
            /playing ([A-Z][^.!?]*)/g,
            /worked on ([A-Z][^.!?]*)/g,
            /practicing ([A-Z][^.!?]*)/g,
            /song called ([^.!?]+)/gi,
            /piece called ([^.!?]+)/gi
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
     * Generate corrections and update text processor
     */
    async generateAndApplyCorrections(potentialErrors) {
        const corrections = {};
        
        // Add high-frequency errors
        for (const [key, data] of potentialErrors.entries()) {
            if (data.frequency >= 2) { // Lower threshold for manual data
                corrections[key] = data.right;
            }
        }

        // Add instrument-specific corrections
        if (this.instrumentContext.get('piano') > 5) {
            Object.assign(corrections, {
                'peddle': 'pedal',
                'sustane': 'sustain',
                'dinamics': 'dynamics',
                'forta': 'forte',
                'pieno': 'piano'
            });
        }

        if (this.instrumentContext.get('guitar') > 5) {
            Object.assign(corrections, {
                'fret board': 'fretboard',
                'bar chord': 'barre chord',
                'pics': 'picks',
                'finger picking': 'fingerpicking'
            });
        }

        console.log(`📝 Generated ${Object.keys(corrections).length} corrections`);

        // Update textProcessor.js
        try {
            const { updateTextProcessor } = require('./data-analyzer');
            await updateTextProcessor(corrections);
        } catch (error) {
            console.error('❌ Failed to update textProcessor.js:', error.message);
        }

        return corrections;
    }

    /**
     * Generate report
     */
    generateReport(potentialErrors, corrections) {
        return {
            timestamp: new Date().toISOString(),
            source: 'manual-import',
            totalPatterns: potentialErrors.size,
            totalCorrections: Object.keys(corrections).length,
            instrumentDistribution: Object.fromEntries(this.instrumentContext),
            topErrors: Array.from(potentialErrors.entries())
                .sort((a, b) => b[1].frequency - a[1].frequency)
                .slice(0, 10)
                .map(([key, data]) => ({ error: key, frequency: data.frequency, correction: data.right })),
            songTitles: Array.from(this.songTitles).slice(0, 20)
        };
    }
}

module.exports = ManualDataAnalyzer;

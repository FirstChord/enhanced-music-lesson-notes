#!/usr/bin/env node

/**
 * Manual Data Import Setup - For when API access isn't available
 */

const readline = require('readline');
const ManualDataAnalyzer = require('./manual-analyzer');
const fs = require('fs').promises;
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupManualAnalysis() {
    console.log('📄 Manual Data Import Setup');
    console.log('============================\n');
    console.log('Since API access isn\'t available, let\'s work with exported data files!\n');

    try {
        console.log('📋 Supported file formats:');
        console.log('   • JSON (.json) - Exported lesson data');
        console.log('   • CSV (.csv) - MyMusicStaff exports, spreadsheets');
        console.log('   • Text (.txt) - Plain text notes (one per line/paragraph)\n');

        const filePath = await question('📁 Enter the path to your data file: ');

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            console.log(`❌ File not found: ${filePath}`);
            console.log('💡 Tips:');
            console.log('   • Drag and drop the file into terminal to get the path');
            console.log('   • Make sure the file exists and you have permission to read it');
            rl.close();
            return;
        }

        console.log(`✅ File found: ${path.basename(filePath)}`);
        console.log('\n🔍 Starting analysis...\n');

        const analyzer = new ManualDataAnalyzer();
        
        // Process the file
        const notes = await analyzer.processFromFile(filePath);
        
        if (notes.length === 0) {
            console.log('❌ No notes found in the file');
            console.log('💡 Make sure your file contains text content in recognizable columns/fields');
            rl.close();
            return;
        }

        // Analyze the notes
        const potentialErrors = await analyzer.analyzeNotes(notes);
        
        // Generate corrections
        const corrections = await analyzer.generateAndApplyCorrections(potentialErrors);
        
        // Generate report
        const report = analyzer.generateReport(potentialErrors, corrections);
        
        // Save report
        await fs.writeFile(
            path.join(__dirname, 'manual-analysis-report.json'),
            JSON.stringify(report, null, 2)
        );

        console.log('\n🎉 Analysis completed successfully!');
        console.log('\n📊 Results Summary:');
        console.log(`   📝 Notes processed: ${notes.length}`);
        console.log(`   🔍 Error patterns found: ${potentialErrors.size}`);
        console.log(`   🔧 Corrections added: ${Object.keys(corrections).length}`);
        
        if (report.instrumentDistribution) {
            console.log('   🎵 Instruments detected:');
            Object.entries(report.instrumentDistribution).forEach(([instrument, count]) => {
                console.log(`     ${instrument}: ${count} mentions`);
            });
        }

        if (report.topErrors && report.topErrors.length > 0) {
            console.log('\n🔥 Top Speech Recognition Errors Fixed:');
            report.topErrors.slice(0, 5).forEach((error, i) => {
                console.log(`   ${i + 1}. "${error.error}" → "${error.correction}" (${error.frequency} times)`);
            });
        }

        if (report.songTitles && report.songTitles.length > 0) {
            console.log(`\n🎵 Song titles found: ${report.songTitles.length}`);
            console.log(`   Examples: ${report.songTitles.slice(0, 3).join(', ')}`);
        }

        console.log('\n📄 Detailed report saved to: manual-analysis-report.json');
        console.log('🔧 textProcessor.js has been updated with improvements!');
        
        console.log('\n💡 Next steps:');
        console.log('   1. Test your Chrome extension to see the improvements');
        console.log('   2. Export more notes data periodically to keep improving');
        console.log('   3. Check the report file for detailed insights');

    } catch (error) {
        console.error('\n❌ Analysis failed:');
        console.error(`   ${error.message}`);
        
        if (error.message.includes('Unsupported file format')) {
            console.log('\n🔧 Supported formats:');
            console.log('   • .json - JSON data exports');
            console.log('   • .csv - Comma-separated values (Excel, Google Sheets)');
            console.log('   • .txt - Plain text files');
        }
    } finally {
        rl.close();
    }
}

// Export data format examples
async function showExamples() {
    console.log('📋 Example Data Formats\n');
    
    console.log('🔸 JSON Format:');
    console.log('```json');
    console.log('[');
    console.log('  { "content": "Today we worked on C major chords and scales" },');
    console.log('  { "notes": "Student needs to practice finger positioning" },');
    console.log('  { "description": "Homework: practice Fur Elise slowly" }');
    console.log(']');
    console.log('```\n');
    
    console.log('🔸 CSV Format:');
    console.log('```csv');
    console.log('Date,Student,Lesson Notes,Homework');
    console.log('2024-01-15,John,"Worked on chords","Practice scales daily"');
    console.log('2024-01-16,Sarah,"Finger exercises","Slow practice tempo"');
    console.log('```\n');
    
    console.log('🔸 Text Format:');
    console.log('```txt');
    console.log('Today we worked on C major chords and the student did well');
    console.log('');
    console.log('Need to practice scales more slowly with proper fingering');
    console.log('');
    console.log('Homework: practice Fur Elise at 60 BPM with metronome');
    console.log('```');
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--examples') || args.includes('-e')) {
        await showExamples();
        return;
    }
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('📄 Manual Data Import for Music Lesson Notes');
        console.log('Usage:');
        console.log('  node manual-setup.js           # Start interactive import');
        console.log('  node manual-setup.js --examples # Show data format examples');
        console.log('  node manual-setup.js --help     # Show this help');
        return;
    }
    
    await setupManualAnalysis();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { setupManualAnalysis, showExamples };

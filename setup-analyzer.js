#!/usr/bin/env node

/**
 * Interactive setup script for the Notes Data Analyzer
 * Helps configure API credentials and run the analysis
 */

const readline = require('readline');
const NotesDataAnalyzer = require('./data-analyzer');
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

async function setupAnalyzer() {
    console.log('🎵 Music Lesson Notes Data Analyzer Setup');
    console.log('=======================================\n');

    try {
        // Get API credentials
        console.log('📡 API Configuration:');
        const apiKey = await question('Enter your API key: ');
        
        let baseUrl = await question('Enter your API base URL (e.g., https://api.yourservice.com or api.yourservice.com): ');
        
        // Validate and normalize base URL
        if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = `https://${baseUrl}`;
        }
        
        // Remove trailing slash
        baseUrl = baseUrl.replace(/\/$/, '');
        
        console.log(`✅ Normalized URL: ${baseUrl}`);
        
        // Optional: Get specific endpoint
        const useCustomEndpoint = await question('Use custom endpoint? (y/N): ');
        let endpoint = '/notes';
        if (useCustomEndpoint.toLowerCase() === 'y' || useCustomEndpoint.toLowerCase() === 'yes') {
            endpoint = await question('Enter custom endpoint (default: /notes): ') || '/notes';
        }

        // Optional: Set limit
        const limit = await question('Number of notes to analyze (default: 1000): ') || '1000';

        console.log('\n🔍 Configuration Summary:');
        console.log(`   API URL: ${baseUrl}${endpoint}`);
        console.log(`   Limit: ${limit} notes`);
        console.log(`   API Key: ${apiKey.substring(0, 8)}...`);

        // Test API connection first
        console.log('\n🧪 Testing API connection...');
        const connectionOk = await testAPIConnection(apiKey, baseUrl, endpoint);
        
        if (!connectionOk) {
            console.log('\n❌ API connection failed. Please check your credentials and try again.');
            rl.close();
            return;
        }

        const confirm = await question('\nAPI connection successful! Proceed with full analysis? (Y/n): ');
        if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'no') {
            console.log('❌ Analysis cancelled');
            rl.close();
            return;
        }

        console.log('\n🚀 Starting analysis...\n');

        // Create analyzer and run
        const analyzer = new NotesDataAnalyzer(apiKey, baseUrl);
        await analyzer.fetchNotes(endpoint, parseInt(limit));
        const report = await analyzer.analyze();

        console.log('\n🎉 Analysis completed successfully!');
        console.log('\n📋 Quick Summary:');
        console.log(`   ✅ ${Object.keys(report.totalCorrections || {}).length} new corrections added`);
        console.log(`   📊 Analysis report saved to: analysis-report.json`);
        console.log(`   🔧 textProcessor.js updated (backup saved)`);
        
        if (report.topErrors && report.topErrors.length > 0) {
            console.log('\n🔥 Top Speech Recognition Errors Found:');
            report.topErrors.slice(0, 5).forEach((error, i) => {
                console.log(`   ${i + 1}. "${error.error}" → "${error.correction}" (${error.frequency} times)`);
            });
        }

        console.log('\n💡 Next Steps:');
        console.log('   1. Test your Chrome extension with the improvements');
        console.log('   2. Check analysis-report.json for detailed insights');
        console.log('   3. Re-run analysis periodically as you get more notes');

    } catch (error) {
        console.error('\n❌ Analysis failed:');
        console.error(`   ${error.message}`);
        
        if (error.message.includes('API Error')) {
            console.log('\n🔧 API Troubleshooting:');
            console.log('   • Check your API key is correct');
            console.log('   • Verify the base URL is accessible');
            console.log('   • Ensure your API supports the endpoint');
            console.log('   • Check if authentication headers are correct');
        }
    } finally {
        rl.close();
    }
}

// Handle different API formats
async function testAPIConnection(apiKey, baseUrl, endpoint) {
    console.log('🔗 Testing API connection...');
    
    try {
        // Normalize URL construction
        let normalizedBaseUrl = baseUrl;
        if (!normalizedBaseUrl.startsWith('http://') && !normalizedBaseUrl.startsWith('https://')) {
            normalizedBaseUrl = `https://${normalizedBaseUrl}`;
        }
        normalizedBaseUrl = normalizedBaseUrl.replace(/\/$/, '');
        endpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        const testUrl = new URL(`${normalizedBaseUrl}${endpoint}`);
        testUrl.searchParams.append('limit', '1');
        
        console.log(`   Testing: ${testUrl.toString()}`);
        
        const response = await fetch(testUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            console.log('✅ API connection successful');
            const data = await response.json();
            console.log(`   Response preview: ${JSON.stringify(data).substring(0, 100)}...`);
            return true;
        } else {
            console.log(`❌ API returned status: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.log(`   Error details: ${errorText.substring(0, 200)}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Connection failed: ${error.message}`);
        if (error.message.includes('Failed to parse URL')) {
            console.log('💡 Tip: Make sure your base URL includes the protocol (https://) or domain name');
        }
        return false;
    }
}

// Additional utility functions
async function showExistingReport() {
    try {
        const reportPath = path.join(__dirname, 'analysis-report.json');
        const reportContent = await fs.readFile(reportPath, 'utf8');
        const report = JSON.parse(reportContent);
        
        console.log('📊 Previous Analysis Report:');
        console.log(`   Date: ${new Date(report.timestamp).toLocaleString()}`);
        console.log(`   Total Patterns: ${report.totalPatterns}`);
        console.log(`   Corrections Added: ${report.totalCorrections}`);
        
        if (report.instrumentDistribution) {
            console.log('   Instrument Distribution:');
            Object.entries(report.instrumentDistribution).forEach(([instrument, count]) => {
                console.log(`     ${instrument}: ${count} notes`);
            });
        }
        
        return true;
    } catch (error) {
        console.log('📄 No previous analysis report found');
        return false;
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--report') || args.includes('-r')) {
        await showExistingReport();
        return;
    }
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('🎵 Music Lesson Notes Data Analyzer');
        console.log('Usage:');
        console.log('  node setup-analyzer.js          # Interactive setup');
        console.log('  node setup-analyzer.js --report # Show previous report');
        console.log('  node setup-analyzer.js --help   # Show this help');
        return;
    }
    
    await setupAnalyzer();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { setupAnalyzer, testAPIConnection, showExistingReport };

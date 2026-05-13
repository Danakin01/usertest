const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const FILE_PATH = path.join(__dirname, 'evaluation_results.csv');

// Initialize CSV with headers if it doesn't exist
if (!fs.existsSync(FILE_PATH)) {
    const headers = 'Timestamp,Platform,Accuracy,Answered,AvgSpeed,FactualRating,Timing,Clarity,Errors,Suggestions\n';
    fs.writeFileSync(FILE_PATH, headers);
}

const server = http.createServer((req, res) => {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/save-evaluation') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const row = [
                    new Date().toLocaleString(),
                    data.platform,
                    data.accuracy,
                    data.answered,
                    data.avgSpeed,
                    data.factualRating,
                    data.timing,
                    data.clarity,
                    data.errors.replace(/,/g, ';').replace(/\n/g, ' '), // Clean for CSV
                    data.suggestions.replace(/,/g, ';').replace(/\n/g, ' ')
                ].join(',') + '\n';

                fs.appendFileSync(FILE_PATH, row);
                console.log('✅ Evaluation saved to evaluation_results.csv');
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success' }));
            } catch (err) {
                console.error('❌ Error saving evaluation:', err);
                res.writeHead(500);
                res.end('Server Error');
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Results Server running at http://localhost:${PORT}`);
    console.log(`📂 Evaluations will be saved to: ${FILE_PATH}`);
});

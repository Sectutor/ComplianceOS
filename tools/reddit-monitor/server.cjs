const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8777;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // API endpoint: proxy Reddit search
    if (parsedUrl.pathname === '/api/search') {
        handleRedditSearch(req, res, parsedUrl.query);
        return;
    }

    // Serve static files
    let filePath = path.join(__dirname, parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

function handleRedditSearch(req, res, query) {
    const subreddit = query.subreddit;
    const keyword = query.keyword;

    if (!subreddit || !keyword) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing subreddit or keyword' }));
        return;
    }

    const redditUrl = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/search.json?q=${encodeURIComponent(keyword)}&sort=new&restrict_sr=on&t=week&limit=25&raw_json=1`;

    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
    };

    https.get(redditUrl, options, (redditRes) => {
        let body = '';

        // Handle rate limiting
        if (redditRes.statusCode === 429) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Reddit rate limit hit. Wait a minute and try again.', retryAfter: 60 }));
            return;
        }

        if (redditRes.statusCode !== 200) {
            res.writeHead(redditRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Reddit returned status ${redditRes.statusCode}` }));
            return;
        }

        redditRes.on('data', chunk => body += chunk);
        redditRes.on('end', () => {
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            });
            res.end(body);
        });
    }).on('error', (err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    });
}

server.listen(PORT, () => {
    console.log(`Compliance Lead Monitor running at http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop');
});

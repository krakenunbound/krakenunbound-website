const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const ROOT = __dirname;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.bin': 'application/octet-stream',
    '.a26': 'application/octet-stream'
};

const server = http.createServer((req, res) => {
    let filePath = path.join(ROOT, decodeURIComponent(req.url === '/' ? '/index.html' : req.url));

    // Security: prevent directory traversal
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found: ' + req.url);
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
            return;
        }

        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('=================================');
    console.log('  Atari 2600 Emulator Server');
    console.log('=================================');
    console.log('');
    console.log('  Open in browser:');
    console.log('  http://localhost:' + PORT);
    console.log('');
    console.log('  Press Ctrl+C to stop');
    console.log('');
});

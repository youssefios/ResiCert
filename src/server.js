// @ts-check
/**
 * Zero-dependency HTTP server for ResiCert.
 *
 * Why no framework? The target environment has no network access for `npm
 * install`, so ResiCert is built to run on a stock Node.js with nothing to
 * install: `node src/server.js` and open the printed URL.
 *
 * Serves:
 *   - the static single-page UI from src/web/
 *   - a small JSON API:
 *       POST /api/assess               body: Project (partial ok) -> full report
 *       GET  /api/default-project      -> a fully-populated default Project
 *       GET  /api/samples              -> sample project library
 *       GET  /api/schemes              -> certification scheme catalogue
 *       GET  /api/approved-documents   -> Approved Documents reference list
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

import { runAssessment, defaultProject } from './engine/index.js';
import { SAMPLE_PROJECTS } from './data/sampleProjects.js';
import { SCHEMES } from './engine/certifications/schemes.js';
import { APPROVED_DOCUMENTS } from './engine/regulations/approvedDocuments.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, 'web');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/** @param {import('node:http').ServerResponse} res @param {number} code @param {any} obj */
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

/** Read and parse a JSON request body (with a sane size cap). @param {import('node:http').IncomingMessage} req */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) { reject(new Error('Request body too large')); req.destroy(); return; }
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

/** Serve a static file from the web root, guarding against path traversal. */
async function serveStatic(res, urlPath) {
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(WEB_ROOT, rel === '/' || rel === '' ? 'index.html' : rel);
  if (!filePath.startsWith(WEB_ROOT)) { sendJson(res, 403, { error: 'Forbidden' }); return; }
  try {
    const buf = await readFile(filePath);
    const type = MIME[extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    res.end(buf);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    if (path === '/api/assess' && req.method === 'POST') {
      const body = await readBody(req);
      return sendJson(res, 200, runAssessment(body));
    }
    if (path === '/api/default-project' && req.method === 'GET') {
      return sendJson(res, 200, defaultProject());
    }
    if (path === '/api/samples' && req.method === 'GET') {
      return sendJson(res, 200, SAMPLE_PROJECTS);
    }
    if (path === '/api/schemes' && req.method === 'GET') {
      return sendJson(res, 200, SCHEMES.map(({ id, name, owner, focus, bestFor, summary }) => ({ id, name, owner, focus, bestFor, summary })));
    }
    if (path === '/api/approved-documents' && req.method === 'GET') {
      return sendJson(res, 200, APPROVED_DOCUMENTS);
    }
    if (path.startsWith('/api/')) {
      return sendJson(res, 404, { error: 'Unknown API endpoint' });
    }
    return serveStatic(res, path);
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'Bad request' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  ResiCert running →  http://${HOST}:${PORT}\n`);
  console.log('  UK residential certification (indicative pre-assessment).');
  console.log('  Ctrl+C to stop.\n');
});

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const port = Number(process.env.PORT || 3000);
const root = process.cwd();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// Route table mirrors netlify.toml redirects so the Evidence tab + other pages work locally.
const apiRoutes = [
  { method: 'POST', pattern: /^\/api\/analyze$/,                        fn: 'analyze' },
  { method: 'POST', pattern: /^\/api\/simulate\/blast-radius$/,         fn: 'simulate-blast-radius' },
  { method: 'GET',  pattern: /^\/api\/simulate\/top-scenarios$/,        fn: 'simulate-top-scenarios' },
  { method: 'GET',  pattern: /^\/api\/scenarios\/prebuilt$/,            fn: 'scenarios-prebuilt' },
  { method: 'GET',  pattern: /^\/api\/assets\/([^/]+)\/paths$/,         fn: 'assets-paths',   param: 'assetId' },
  { method: 'GET',  pattern: /^\/api\/assets\/([^/]+)\/risk$/,          fn: 'assets-risk',    param: 'assetId' },
  { method: 'GET',  pattern: /^\/api\/evidence\/([^/]+)$/,              fn: 'evidence',       param: 'assetId' },
];

async function handleAssetsList(res) {
  const data = require(join(root, 'netlify', 'functions', '_shared', 'data.js')).loadPlantData();
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ assets: data.assets }));
}

async function readBody(req) {
  return await new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => (buf += c));
    req.on('end', () => resolve(buf));
    req.on('error', reject);
  });
}

async function dispatchApi(req, res, url) {
  for (const route of apiRoutes) {
    if (route.method !== req.method) continue;
    const m = url.pathname.match(route.pattern);
    if (!m) continue;
    const qs = Object.fromEntries(url.searchParams);
    if (route.param && m[1]) qs[route.param] = decodeURIComponent(m[1]);
    const body = req.method === 'POST' ? await readBody(req) : undefined;
    const mod = require(join(root, 'netlify', 'functions', `${route.fn}.js`));
    const result = await mod.handler({ httpMethod: req.method, queryStringParameters: qs, body });
    res.writeHead(result.statusCode || 200, result.headers || { 'content-type': 'application/json' });
    res.end(result.body || '');
    return true;
  }
  return false;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://localhost:${port}`);

    if (url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/assets' && req.method === 'GET') { await handleAssetsList(res); return; }
      if (await dispatchApi(req, res, url)) return;
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: `no route for ${req.method} ${url.pathname}` }));
      return;
    }

    const requested = url.pathname === '/' ? '/index.html' : url.pathname;
    const candidates = [join(root, 'web', requested.replace(/^\/+/, '')), join(root, requested.replace(/^\/+/, ''))];
    const full = candidates.find(existsSync);

    if (!full) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const content = await readFile(full);
    res.writeHead(200, { 'content-type': mime[extname(full)] || 'application/octet-stream' });
    res.end(content);
  } catch (error) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: String(error) }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`OTSniffer demo server on http://localhost:${port}`);
});

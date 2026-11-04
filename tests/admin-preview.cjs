// Manual UI check: node tests/admin-preview.cjs, then http://127.0.0.1:4173/
// All GitHub requests are mocked in memory. No credentials or remote writes.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = new Map(['wiki-data', 'game-data', 'update-log'].map((name) => {
  const file = `content/${name}.json`;
  return [file, { type: 'file', sha: name, content: fs.readFileSync(path.join(root, file)).toString('base64') }];
}));
let revision = 0;
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4173');
  const json = (value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  if (url.pathname === '/__mobile') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end('<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0;background:#161b17;display:grid;justify-content:center"><iframe title="390px mobile admin preview" src="/#/life/frost-conversion" style="width:390px;height:100dvh;border:0;max-width:100vw"></iframe>');
  }
  if (url.pathname.startsWith('/__github/')) {
    const api = url.pathname.slice('/__github'.length);
    if (api === '/user') return json({ login: 'preview-editor', avatar_url: '' });
    if (api.endsWith('/commits')) return json([{ sha: 'preview-baseline' }]);
    if (api.endsWith('/permission')) return json({ permission: 'write' });
    const file = decodeURIComponent(api.split('/contents/')[1] || '');
    if (req.method === 'PUT' || req.method === 'DELETE') {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      if (files.get(file)?.sha !== body.sha) return json({ message: 'Revision changed' }, 409);
      if (req.method === 'DELETE') { files.delete(file); return json({}); }
      const next = { type: 'file', sha: `preview-${++revision}`, content: body.content };
      files.set(file, next);
      return json({ content: next });
    }
    return json(files.get(file) || { message: 'Not found' }, files.has(file) ? 200 : 404);
  }
  const filename = path.resolve(root, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
  if (!filename.startsWith(root + path.sep)) return json({}, 403);
  try {
    let data = fs.readFileSync(filename);
    if (filename.endsWith('index.html')) {
      const mock = `<script>
        sessionStorage.setItem('ri-edit-token', 'local-preview-only');
        const originalFetch = window.fetch.bind(window);
        window.fetch = (input, options) => {
          const url = new URL(input, location.href);
          return originalFetch(url.hostname === 'api.github.com' ? '/__github' + url.pathname + url.search : input, options);
        };
        if (!location.hash) location.hash = '#/life/monster-evolution';
      </script>`;
      data = data.toString().replace('<script type="module"', mock + '<script type="module"');
    }
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' }[path.extname(filename)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(data);
  } catch { json({}, 404); }
}).listen(4173, '127.0.0.1', () => console.log('Local admin preview: http://127.0.0.1:4173/ (memory only)'));

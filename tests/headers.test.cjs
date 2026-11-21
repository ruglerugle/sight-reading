const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
const get = (name) => (headers.match(new RegExp(`^\\s+${name}:\\s*(.+)$`, 'im')) || [])[1];

test('_headers: 基本のセキュリティヘッダーが全ページに付く', () => {
  assert.match(headers, /^\/\*\s*$/m);
  assert.match(get('Strict-Transport-Security'), /max-age=\d{7,}/);
  assert.equal(get('X-Frame-Options'), 'DENY');
  assert.equal(get('X-Content-Type-Options'), 'nosniff');
  assert.equal(get('Referrer-Policy'), 'strict-origin-when-cross-origin');
});

test('_headers: CSP は default-src self で、必要な読み込み先だけ許可する', () => {
  const csp = get('Content-Security-Policy');
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src [^;]*https:\/\/cdn\.jsdelivr\.net/);
  assert.match(csp, /script-src [^;]*https:\/\/feedback\.habatakijuku\.com/);
  assert.match(csp, /style-src [^;]*https:\/\/fonts\.googleapis\.com/);
  assert.match(csp, /font-src [^;]*https:\/\/fonts\.gstatic\.com/);
  assert.match(csp, /connect-src 'self'/); // /api/* と音源の fetch は同じ origin
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.doesNotMatch(csp, /(script|default)-src [^;]*\s\*(\s|;|$)/);
});

test('外部 origin の script / stylesheet は CSP で許可済み', () => {
  const csp = get('Content-Security-Policy');
  for (const p of ['index.html', '404.html', 'mypage/index.html']) {
    const html = fs.readFileSync(path.join(root, p), 'utf8');
    for (const m of html.matchAll(/<script[^>]+src="(https:\/\/[^"/]+)/g)) assert.ok(csp.includes(m[1]), `${p}: ${m[1]}`);
    for (const m of html.matchAll(/<link[^>]+href="(https:\/\/[^"/]+)[^"]*"[^>]*rel="stylesheet"/g)) assert.ok(csp.includes(m[1]), `${p}: ${m[1]}`);
  }
});

test('CDN の script は版を固定し crossorigin を付ける', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script[^>]+src="https:\/\/cdn\.jsdelivr\.net[^"]*"[^>]*>/g)];
  assert.ok(tags.length > 0);
  for (const m of tags) {
    assert.match(m[0], /@\d+\.\d+\.\d+\//);
    assert.match(m[0], /crossorigin/);
  }
});

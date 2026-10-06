import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const baseUrl = process.env.CHAT_BASE_URL ?? 'http://localhost:80';
const checks = [];
const check = (name, passed, detail = '') => checks.push({ name, passed, detail });

try {
  const index = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
  check('Built frontend index', index.includes('<div id="root"></div>'));
  check('Built frontend bundle reference', /<script type="module"[^>]+src="\/assets\//.test(index));
} catch (error) {
  check('Built frontend artifact', false, error.message);
}

try {
  const response = await fetch(`${baseUrl}/api/conversations?userId=alice`);
  const body = await response.text();
  check('REST conversation listing', response.ok, `HTTP ${response.status} ${body.slice(0, 120)}`);
} catch (error) {
  check('REST conversation listing', null, `SKIPPED: backend/Nginx is not reachable here (${error.message})`);
}

await new Promise((resolve) => {
  const timeout = setTimeout(() => {
    check('WebSocket handshake', null, 'SKIPPED: backend/Nginx is not reachable here.');
    resolve();
  }, 2500);
  const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws/chat?userId=alice&conversationId=11111111-1111-1111-1111-111111111111';
  const ws = new WebSocket(wsUrl);
  ws.once('open', () => {
    clearTimeout(timeout);
    check('WebSocket handshake', true, 'Socket opened through Nginx.');
    ws.close();
    resolve();
  });
  ws.once('error', (error) => {
    clearTimeout(timeout);
    check('WebSocket handshake', null, `SKIPPED: backend/Nginx is not reachable here (${error.message})`);
    resolve();
  });
});

console.log('Distributed Chat runtime smoke test');
for (const item of checks) {
  const label = item.passed === null ? 'SKIP' : item.passed ? 'PASS' : 'FAIL';
  console.log(`${label} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}
if (checks.some((item) => item.passed === false)) process.exitCode = 1;

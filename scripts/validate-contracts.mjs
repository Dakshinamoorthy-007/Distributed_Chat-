import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFile(path.join(root, relative), 'utf8');
const checks = [];
function check(name, value) { checks.push({ name, pass: Boolean(value) }); }

const controller = await read('distributed-chat-backend/src/main/java/com/dakshin/chat/controller/ConversationController.java');
const history = await read('distributed-chat-backend/src/main/java/com/dakshin/chat/controller/HistoryController.java');
const presence = await read('distributed-chat-backend/src/main/java/com/dakshin/chat/controller/PresenceController.java');
const service = await read('distributed-chat-backend/src/main/java/com/dakshin/chat/service/ConversationService.java');
const members = await read('distributed-chat-backend/src/main/java/com/dakshin/chat/repository/ConversationMemberRepository.java');
const api = await read('distributed-chat-frontend/src/services/api.ts');
const socket = await read('distributed-chat-frontend/src/services/websocket.ts');
const app = await read('distributed-chat-frontend/src/App.tsx');
const hook = await read('distributed-chat-frontend/src/hooks/useChatSocket.ts');
const compose = await read('docker-compose.yml');
const nginx = await read('distributed-chat-backend/nginx/nginx.conf');

check('Conversation listing GET contract', controller.includes('getConversations(@RequestParam String userId)'));
check('Conversation creation POST contract', controller.includes('createConversation(') && controller.includes('@PostMapping'));
check('Conversation membership POST contract', controller.includes('@PostMapping("/{conversationId}/members")'));
check('Conversation members GET contract', controller.includes('@GetMapping("/{conversationId}/members")'));
check('History GET contract', history.includes('@GetMapping("/{conversationId}/messages")'));
check('Presence GET contract', presence.includes('@GetMapping("/{userId}")'));
check('User conversation repository query exists', members.includes('findByUserId(String userId)'));
check('Conversation service uses membership query', service.includes('memberRepository.findByUserId(userId.trim())'));
check('Frontend calls conversation listing', api.includes('/api/conversations?userId='));
check('Frontend calls conversation creation', api.includes("'/api/conversations'"));
check('Frontend calls membership API', api.includes('/members'));
check('Frontend calls members API', api.includes('/api/conversations/${encodeURIComponent(conversationId)}/members'));
check('Frontend calls history API', api.includes('/api/conversations/${encodeURIComponent(conversationId)}/messages'));
check('Frontend calls presence API', api.includes('/api/presence/${encodeURIComponent(userId)}'));
check('WebSocket URL matches backend contract', socket.includes('/ws/chat?userId=${encodeURIComponent(this.options.userId)}&conversationId=${encodeURIComponent(this.options.conversationId)}'));
check('WebSocket payload excludes userId', socket.includes('JSON.stringify({ conversationId, content })'));
check('Frontend handles CONNECTED event', hook.includes("event.type === 'CONNECTED'"));
check('Frontend handles WebSocket MESSAGE event', app.includes("event.type === 'MESSAGE'"));
check('Frontend handles server rejection codes', socket.includes('event.code === 1007 || event.code === 1008'));
check('Nginx proxies REST to backend pool', nginx.includes('location /api/') && nginx.includes('proxy_pass http://chat_servers;'));
check('Nginx proxies WebSocket with upgrade', nginx.includes('location /ws/') && nginx.includes('proxy_set_header Upgrade $http_upgrade;') && nginx.includes('proxy_set_header Connection "upgrade";'));
check('Compose includes two backend instances', compose.includes('server-1:') && compose.includes('server-2:'));
check('Compose includes Postgres and Redis', compose.includes('postgres:') && compose.includes('redis:'));
check('Compose builds integrated Nginx frontend image', compose.includes('dockerfile: distributed-chat-backend/nginx/Dockerfile'));

console.log('Distributed Chat contract validation');
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}`);
if (checks.some((item) => !item.pass)) process.exitCode = 1;

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from '../config/logger';

interface ExtendedWebSocket extends WebSocket {
  rooms: Set<string>;
  isAlive: boolean;
}

let wss: WebSocketServer;
const clients = new Set<ExtendedWebSocket>();

export function setupWebSocketServer(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: ExtendedWebSocket) => {
    ws.rooms = new Set(['public:all']);
    ws.isAlive = true;
    clients.add(ws);
    logger.debug('WebSocket client connected');

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { action: string; room: string };
        if (msg.action === 'subscribe' && msg.room) {
          ws.rooms.add(msg.room);
          logger.debug(`Client subscribed to room: ${msg.room}`);
        } else if (msg.action === 'unsubscribe' && msg.room) {
          ws.rooms.delete(msg.room);
        }
      } catch {
        logger.warn('Invalid WS message received');
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      logger.debug('WebSocket client disconnected');
    });

    ws.on('error', (err) => logger.error('WebSocket error', err));
  });

  // Heartbeat
  const heartbeat = setInterval(() => {
    clients.forEach((ws) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(heartbeat));
  logger.info('WebSocket server initialized');
}

export function broadcast(room: string, event: { type: string; payload: unknown; timestamp: string }): void {
  const message = JSON.stringify(event);
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN && (ws.rooms.has(room) || ws.rooms.has('public:all'))) {
      ws.send(message);
    }
  });
}

export function getConnectionCount(): number {
  return clients.size;
}

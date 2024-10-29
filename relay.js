// relay.js
import { WebSocketServer } from 'ws';
import { RealtimeClient } from '@openai/realtime-api-beta';

class RealtimeRelay {
  constructor(apiKey, server) {
    this.apiKey = apiKey;
    this.wss = new WebSocketServer({ server });
    this.wss.on('connection', this.connectionHandler.bind(this));
    this.log('WebSocket server initialized');
  }

  async connectionHandler(ws, req) {
    if (!req.url) {
      this.log('No URL provided, closing connection.');
      ws.close();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname !== '/') {
      this.log(`Invalid pathname: "${pathname}"`);
      ws.close();
      return;
    }

    // Instantiate new client
    this.log(`Connecting to OpenAI with API key...`);
    const client = new RealtimeClient({ apiKey: this.apiKey });

    // Relay: OpenAI Realtime API Event -> Browser Event
    client.realtime.on('server.*', (event) => {
      this.log(`Relaying "${event.type}" to client`);
      ws.send(JSON.stringify(event));
    });

    client.realtime.on('close', () => {
      this.log('OpenAI connection closed. Closing client WebSocket.');
      ws.close();
    });

    // Relay: Browser Event -> OpenAI Realtime API Event
    const messageQueue = [];
    const messageHandler = (data) => {
      try {
        const event = JSON.parse(data);
        this.log(`Relaying "${event.type}" to OpenAI`);
        client.realtime.send(event.type, event);
      } catch (e) {
        this.log(`Error parsing event from client: ${e.message}`);
      }
    };

    ws.on('message', (data) => {
      if (!client.isConnected()) {
        messageQueue.push(data);
      } else {
        messageHandler(data);
      }
    });

    ws.on('close', () => {
      this.log('Client WebSocket closed. Disconnecting from OpenAI.');
      client.disconnect();
    });

    // Connect to OpenAI Realtime API
    try {
      this.log('Connecting to OpenAI...');
      await client.connect();
      this.log('Connected to OpenAI successfully!');
      while (messageQueue.length) {
        messageHandler(messageQueue.shift());
      }
    } catch (e) {
      this.log(`Error connecting to OpenAI: ${e.message}`);
      ws.close();
    }
  }

  log(...args) {
    console.log('[RealtimeRelay]', ...args);
  }
}

export { RealtimeRelay };

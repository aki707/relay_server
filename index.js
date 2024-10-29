// index.js
import express from 'express';
import { RealtimeRelay } from './relay.js';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables from .env file
dotenv.config({ path: '.env', override: true });

const app = express();

// Use CORS middleware
app.use(cors());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const port = parseInt(process.env.PORT, 10) || 8081;

// Validate API Key
if (!OPENAI_API_KEY) {
  console.error(
    'Environment variable "OPENAI_API_KEY" is required.\n' +
    'Please set it in your .env file.'
  );
  process.exit(1);
}

// Start the Express server and capture the server instance
const server = app.listen(port, () => {
  console.log(`Express server is running on http://localhost:${port}`);
});

// Initialize RealtimeRelay with the server instance
try {
  const relay = new RealtimeRelay(OPENAI_API_KEY, server);
  console.log(`RealtimeRelay WebSocket server initialized on ws://localhost:${port}`);
} catch (error) {
  console.error("Failed to initialize RealtimeRelay:", error.message);
}

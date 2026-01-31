import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { WordPressClient, createWordPressClient } from './wordpress/client.js';
import { registerPostTools } from './tools/posts.js';
import { registerPageTools } from './tools/pages.js';
import { registerCommentTools } from './tools/comments.js';
import { registerMediaTools } from './tools/media.js';
import { registerSettingsTools } from './tools/settings.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const API_KEY = process.env.API_KEY;

// API Key authentication middleware
// Supports multiple formats: X-API-Key header, Authorization: Bearer, or Authorization header directly
function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  // If no API_KEY is configured, skip authentication (for local development)
  if (!API_KEY) {
    return next();
  }

  // Try multiple header formats
  let providedKey: string | undefined;

  // 1. Check X-API-Key header (standard)
  if (req.headers['x-api-key']) {
    providedKey = req.headers['x-api-key'] as string;
  }
  // 2. Check Authorization: Bearer <token>
  else if (req.headers.authorization?.startsWith('Bearer ')) {
    providedKey = req.headers.authorization.slice(7);
  }
  // 3. Check Authorization header directly (no Bearer prefix)
  else if (req.headers.authorization) {
    providedKey = req.headers.authorization;
  }

  if (!providedKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing API key. Provide via X-API-Key header or Authorization: Bearer <token>',
    });
    return;
  }

  if (providedKey !== API_KEY) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key',
    });
    return;
  }

  next();
}

// Cache the WordPress client
let wpClient: WordPressClient | null = null;

function getWordPressClient(): WordPressClient {
  if (!wpClient) {
    wpClient = createWordPressClient();
  }
  return wpClient;
}

// Create the MCP server
const server = new McpServer({
  name: 'wordpress-mcp',
  version: '1.0.0',
});

// Register all tools
registerPostTools(server, getWordPressClient);
registerPageTools(server, getWordPressClient);
registerCommentTools(server, getWordPressClient);
registerMediaTools(server, getWordPressClient);
registerSettingsTools(server, getWordPressClient);

// Create Express app
const app = express();

// Parse JSON bodies (skip for /messages - SSE transport reads raw body)
app.use((req, res, next) => {
  if (req.path === '/messages') {
    return next();
  }
  express.json()(req, res, next);
});

// Health check endpoint
app.get('/health', (req, res) => {
  const hasCredentials = !!(
    process.env.WORDPRESS_SITE_URL &&
    process.env.WORDPRESS_USERNAME &&
    process.env.WORDPRESS_APP_PASSWORD
  );

  res.json({
    status: 'ok',
    server: 'wordpress-mcp',
    version: '1.0.0',
    hasCredentials,
    apiKeyProtected: !!API_KEY,
  });
});

// Root endpoint with info
app.get('/', (req, res) => {
  res.json({
    name: 'WordPress MCP Server',
    version: '1.0.0',
    description: 'MCP server for WordPress.org site management',
    endpoints: {
      sse: '/sse (GET) - SSE MCP endpoint',
      messages: '/messages (POST) - SSE message handler',
      health: '/health (GET) - Health check',
    },
  });
});

// Store active SSE transports for session management
const sseTransports = new Map<string, SSEServerTransport>();

// SSE endpoint (fallback/alternative)
app.get('/sse', requireApiKey, async (req, res) => {
  try {
    const transport = new SSEServerTransport('/messages', res);

    // Store transport by its session ID (available after construction)
    const sessionId = transport.sessionId;
    sseTransports.set(sessionId, transport);

    await server.connect(transport);

    // Handle client disconnect
    req.on('close', () => {
      sseTransports.delete(sessionId);
      transport.close();
    });
  } catch (error) {
    console.error('SSE connection error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'SSE connection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

// SSE message endpoint - routes messages to the correct SSE transport
app.post('/messages', requireApiKey, async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId parameter' });
      return;
    }

    const transport = sseTransports.get(sessionId);

    if (!transport) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // SSEServerTransport handles POST messages via handlePostMessage
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error('SSE message error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Message handling failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`WordPress MCP Server running on port ${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  - Health: http://localhost:${PORT}/health`);
  console.log(`  - SSE: http://localhost:${PORT}/sse`);
  console.log(`\nEnvironment:`);
  console.log(`  - WORDPRESS_SITE_URL: ${process.env.WORDPRESS_SITE_URL ? 'Set' : 'Not set'}`);
  console.log(`  - WORDPRESS_USERNAME: ${process.env.WORDPRESS_USERNAME ? 'Set' : 'Not set'}`);
  console.log(`  - WORDPRESS_APP_PASSWORD: ${process.env.WORDPRESS_APP_PASSWORD ? 'Set (hidden)' : 'Not set'}`);
  console.log(`  - API_KEY: ${API_KEY ? 'Protected' : 'Not set (open access)'}`);
});

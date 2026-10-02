import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/routes.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(cors());

  // Capture rawBody for HMAC-SHA256 signature verification on webhooks
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString();
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // Mount API endpoints
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'tz-wifi-billing',
      timestamp: new Date().toISOString(),
    });
  });

  // Omada Controller Inform discovery / heartbeat handler
  app.all('/inform', (_req, res) => {
    res.json({
      success: true,
      result: 0,
      msg: 'success',
      controller: 'TZ-WIFI-OMADA-CONTROLLER',
      timestamp: Date.now(),
    });
  });

  if (!isProd) {
    // Vite middleware for development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[TZ-WiFi] Dev server running with Vite middleware');
  } else {
    // Production static files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('[TZ-WiFi] Production server serving static dist folder');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TZ-WiFi] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[TZ-WiFi] Failed to start server:', err);
  process.exit(1);
});

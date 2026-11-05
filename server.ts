import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Rotas da API (as mesmas funções que a Vercel publica)
import healthHandler from './api/health.js';
import ciganoHandler from './api/cigano.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// No-store cache control for dynamic API endpoints
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

// Health Check
app.all('/api/health', (req, res) => healthHandler(req as any, res as any));

// Cigano (exclusivo do dono)
app.all('/api/cigano', (req, res) => ciganoHandler(req as any, res as any));

// Vite Middleware & SPA Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Cigano — Magia do Tarot] Running on port ${PORT} (0.0.0.0)`);
  });
}

startServer();

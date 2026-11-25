import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {createServer as createViteServer} from 'vite';
import {createApiRouter} from './backend/api/routes';
import {getDb} from './backend/database/store';

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.set('trust proxy', 1);
  app.use(express.json({limit: '1mb'}));

  // Ensure DB is initialized on boot
  getDb();

  // Mount REST API routes
  app.use('/api', createApiRouter());

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output missing. Run npm run build.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`TechNova server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start TechNova server:', err);
  process.exit(1);
});

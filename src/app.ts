import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { basicAuth } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import leadRoutes from './routes/lead.routes';

const app = express();

// Enhanced CORS and Private Network Access headers (allows requests from file:// or any dev client)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Auth middleware (Bonus feature - checks if enabled)
app.use(basicAuth);

// API Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Mount Leads & Notes API Routes
app.use('/api/leads', leadRoutes);

// Static assets for Frontend Portal
const publicPath = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicPath));

// API 404 Catch-All Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({
      success: false,
      error: `API route ${req.method} ${req.originalUrl} not found`
    });
    return;
  }
  next();
});

// Single Page Application fallback for non-API routes
app.use((_req: Request, res: Response) => {
  const indexPath = path.join(publicPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('Portal frontend index.html not found. Please build or run dev.');
    }
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;

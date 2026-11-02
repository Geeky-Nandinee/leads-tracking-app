import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function basicAuth(req: Request, res: Response, next: NextFunction): void {
  // If basic auth is disabled, allow all requests
  if (!config.basicAuth.enabled) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Leads Tracking API"');
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [username, password] = credentials.split(':');

  if (username === config.basicAuth.user && password === config.basicAuth.pass) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Leads Tracking API"');
  res.status(401).json({
    success: false,
    error: 'Invalid credentials'
  });
}

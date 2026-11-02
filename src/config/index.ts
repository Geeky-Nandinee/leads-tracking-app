import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'leads.db'),
  basicAuth: {
    enabled: process.env.ENABLE_BASIC_AUTH === 'true',
    user: process.env.BASIC_AUTH_USER || 'admin',
    pass: process.env.BASIC_AUTH_PASS || 'secret123'
  }
};

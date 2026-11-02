import app from './app';
import { config } from './config';
import { getDatabase } from './db/connection';
import { seedDatabase } from './db/seed';

// Initialize DB schema
getDatabase();

// Auto-seed if database is empty so app works immediately
seedDatabase(false);

const server = app.listen(config.port, () => {
  console.log(`===============================================`);
  console.log(`🚀 Leads Tracking Portal running on port ${config.port}`);
  console.log(`📍 Web Portal: http://localhost:${config.port}`);
  console.log(`📡 API Base:   http://localhost:${config.port}/api/leads`);
  console.log(`🔒 Basic Auth: ${config.basicAuth.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`💾 SQLite DB:  ${config.dbPath}`);
  console.log(`===============================================`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

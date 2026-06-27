import app from './app.js';
import config from './config/env.js';
import { connectDB } from './config/db.js';

const startServer = async () => {
  await connectDB();

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Health check: http://localhost:${config.port}/api/health`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

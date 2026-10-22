import mongoose from 'mongoose';
import app from './app.js';
import { connectDatabase } from './config/db.js';

try {
  await connectDatabase(process.env.MONGODB_URI);
  const port = Number(process.env.PORT || 5000);
  const server = app.listen(port, '0.0.0.0', () => console.log(`TaskFlow API listening on port ${port}`));
  server.on('error', () => {
    console.error('Unable to start the API. Check the port configuration.');
    process.exit(1);
  });

  const shutdown = () => {
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch {
  console.error('Database connection failed. Check MONGODB_URI and MongoDB availability.');
  process.exit(1);
}

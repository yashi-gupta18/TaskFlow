import express from 'express';
import mongoose from 'mongoose';
import tasksRouter from './routes/tasks.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'unavailable',
    database: connected ? 'connected' : 'disconnected',
    application: 'TaskFlow',
  });
});

app.use('/api/tasks', (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
  }
  next();
}, tasksRouter);

app.use((_req, res) => res.status(404).json({ message: 'API endpoint not found.' }));

app.use((error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body must be valid JSON.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large.' });
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid task data.' });
  }
  // Do not send database details or credentials to the browser or logs.
  console.error('Request failed:', error.name);
  res.status(503).json({ message: 'Unable to access tasks right now. Please try again.' });
});

export default app;

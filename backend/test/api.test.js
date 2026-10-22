import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import supertest from 'supertest';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/db.js';

const api = supertest(app);
let database;

before(async () => {
  database = await MongoMemoryServer.create({ binary: { version: '8.0.17' } });
  await connectDatabase(database.getUri('taskflow_test'));
}, { timeout: 1200000 });

after(async () => { await mongoose.disconnect(); await database?.stop(); });

test('CRUD stores tasks in MongoDB and survives a database reconnection', async () => {
  const health = await api.get('/api/health').expect(200);
  assert.equal(health.body.database, 'connected');
  assert.deepEqual((await api.get('/api/tasks').expect(200)).body.tasks, []);
  const created = await api.post('/api/tasks').send({ title: '  Prepare Docker demo  ', description: '  Explain volumes  ' }).expect(201);
  const task = created.body.task;
  assert.equal(task.title, 'Prepare Docker demo');
  assert.equal(task.description, 'Explain volumes');
  assert.equal(task.completed, false);
  const completed = await api.patch(`/api/tasks/${task._id}`).send({ completed: true }).expect(200);
  assert.equal(completed.body.task.completed, true);
  await mongoose.disconnect();
  await api.get('/api/health').expect(503);
  await api.get('/api/tasks').expect(503);
  await connectDatabase(database.getUri('taskflow_test'));
  const stored = await api.get('/api/tasks').expect(200);
  assert.equal(stored.body.tasks[0]._id, task._id);
  assert.equal(stored.body.tasks[0].completed, true);
  await api.patch(`/api/tasks/${task._id}`).send({ completed: false }).expect(200);
  await api.delete(`/api/tasks/${task._id}`).expect(200);
  assert.deepEqual((await api.get('/api/tasks').expect(200)).body.tasks, []);
  await api.delete(`/api/tasks/${task._id}`).expect(404);
  await api.patch(`/api/tasks/${task._id}`).send({ completed: true }).expect(404);
});

test('rejects malformed input without creating tasks', async () => {
  for (const body of [{}, { title: '  ' }, { title: 12 }, { title: 'x'.repeat(121) }, { title: 'test', description: {} }, { title: 'test', description: 'x'.repeat(1001) }, { title: 'test', completed: true }]) {
    await api.post('/api/tasks').send(body).expect(400);
  }
  for (const body of [{}, { completed: 'true' }, { completed: true, title: 'unexpected' }, []]) {
    await api.patch('/api/tasks/507f1f77bcf86cd799439011').send(body).expect(400);
  }
  await api.delete('/api/tasks/not-an-id').expect(400);
  await api.patch('/api/tasks/not-an-id').send({ completed: true }).expect(400);
  await api.post('/api/tasks').set('Content-Type', 'application/json').send('{broken').expect(400);
  await api.post('/api/tasks').send({ title: 'x'.repeat(17000) }).expect(413);
  await api.get('/api/unknown').expect(404);
  assert.deepEqual((await api.get('/api/tasks').expect(200)).body.tasks, []);
});

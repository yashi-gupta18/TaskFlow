import { Router } from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task.js';

const router = Router();
const isObject = (body) => body && typeof body === 'object' && !Array.isArray(body);

router.get('/', async (_req, res) => {
  const tasks = await Task.find().sort({ createdAt: -1, _id: -1 });
  res.json({ tasks });
});

router.post('/', async (req, res) => {
  const body = req.body;
  if (!isObject(body) || Object.keys(body).some(key => !['title', 'description'].includes(key))) {
    return res.status(400).json({ message: 'Provide only a title and an optional description.' });
  }
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 120) {
    return res.status(400).json({ message: 'Title must contain 1 to 120 characters.' });
  }
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.trim().length > 1000)) {
    return res.status(400).json({ message: 'Description must be text with at most 1,000 characters.' });
  }
  const task = await Task.create({ title: body.title, description: body.description });
  res.status(201).json({ task });
});

router.param('id', (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({ message: 'Invalid task ID.' });
  }
  next();
});

router.patch('/:id', async (req, res) => {
  const body = req.body;
  if (!isObject(body) || Object.keys(body).length !== 1 || typeof body.completed !== 'boolean') {
    return res.status(400).json({ message: 'Provide only completed as true or false.' });
  }
  const task = await Task.findByIdAndUpdate(req.params.id, { completed: body.completed }, { new: true, runValidators: true });
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  res.json({ task });
});

router.delete('/:id', async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  res.json({ message: 'Task deleted.' });
});

export default router;

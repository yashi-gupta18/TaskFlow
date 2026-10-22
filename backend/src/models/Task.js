import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  completed: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

export default mongoose.model('Task', taskSchema);

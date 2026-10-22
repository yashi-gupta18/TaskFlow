import mongoose from 'mongoose';

// Return failures promptly instead of buffering requests during database outages.
mongoose.set('bufferCommands', false);

export async function connectDatabase(uri) {
  if (!uri) throw new Error('MONGODB_URI must be set in the environment.');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}

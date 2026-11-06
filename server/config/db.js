import mongoose from 'mongoose';
import { env } from './env.js';

let connectionPromise = null;

export async function connectDB() {
  mongoose.set('strictQuery', true);
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (mongoose.connection.readyState === 2) return mongoose.connection.asPromise();
  if (!env.mongoUri) {
    const error = new Error('MONGO_URI is not configured.');
    error.status = 503;
    throw error;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 20,
      minPoolSize: 0,
    }).then((connection) => {
      console.log('MongoDB connected');
      return connection;
    }).finally(() => {
      connectionPromise = null;
    });
  }

  return connectionPromise;
}

export function dbReady() {
  return mongoose.connection.readyState === 1;
}

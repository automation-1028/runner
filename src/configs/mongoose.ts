import mongoose from 'mongoose';

// Connect to MongoDB
mongoose
  .connect('mongodb://localhost:27017/your_database')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err: Error) => console.error('MongoDB connection error:', err));

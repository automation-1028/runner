import mongoose from 'mongoose';

// Connect to MongoDB
mongoose
  .connect(
    'mongodb+srv://lethanhtuan1028:EARyxyRw0wpYJcvo@youtube.uvpp8.mongodb.net/?retryWrites=true&w=majority&appName=youtube',
  )
  .then(() => console.log('Connected to MongoDB'))
  .catch((err: Error) => console.error('MongoDB connection error:', err));

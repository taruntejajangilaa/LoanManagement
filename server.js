require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Update CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://loan-management-frontend.vercel.app',
    'https://loan-management-fawn.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://taruntejajangila:7euepXMR272vDOJo@loansmanagement.nj7ebmu.mongodb.net/?retryWrites=true&w=majority&appName=LoansManagement';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Successfully connected to MongoDB Atlas');
})
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  console.error('Connection string used:', MONGODB_URI);
});

// Routes
app.use('/api/loans', require('./routes/loans'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: 'development' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Something went wrong!' });
});

// Use environment variable for port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 
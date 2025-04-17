require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Update CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://loan-management-frontend.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    // For development - allow requests with no origin
    if (!origin) return callback(null, true);
    
    // Allow all Vercel preview domains for your project
    if (origin.match(/https:\/\/loan-management-.*?-tarun-teja-jangilas-projects\.vercel\.app$/)) {
      return callback(null, true);
    }
    
    // Check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Log rejected origins for debugging
    console.log('Rejected Origin:', origin);
    callback(null, true); // Temporarily allow all origins while debugging
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Access-Control-Allow-Origin']
}));

// Add error handling middleware before routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

// Middleware
app.use(express.json());

// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Successfully connected to MongoDB Atlas');
})
.catch(err => {
  console.error('MongoDB connection error:', err.message);
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
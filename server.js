import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

// Load environment variables
dotenv.config();

// Validate required environment variables
function checkRequiredEnvVars() {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter(envVar => !process.env[envVar]);
  if (missing.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Local module imports
import connectDB from './config/database.js';
import errorHandler from './middleware/errorHandler.js';

// Initialize the Express application
const app = express();

// ==========================================
// Middleware Configuration
// ==========================================

// helmet() for basic security headers
app.use(helmet());

// cors configuration to allow requests from the frontend URL with credentials
const allowedOrigins = [process.env.FRONTEND_URL, 'https://your-app.vercel.app', 'http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// express.json limits body size to 10kb to prevent payload too large attacks
app.use(express.json({ limit: '10kb' }));

// URL-encoded payload parser for form submissions
app.use(express.urlencoded({ extended: true }));

// Prevent MongoDB Operator Injection (custom middleware for Express 5 compatibility)
app.use((req, res, next) => {
  ['body', 'params', 'headers', 'query'].forEach(key => {
    if (req[key]) {
      mongoSanitize.sanitize(req[key]);
    }
  });
  next();
});

// morgan for HTTP request logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many auth attempts.'
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);


// ==========================================
// Route Registration
// ==========================================

// Import actual routers
import leadRoutes from './routes/leadRoutes.js';
import authRoutes from './routes/authRoutes.js';

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date()
  });
});

// ==========================================
// Error Handling
// ==========================================

// Register global error handler middleware LAST (after all routes)
app.use(errorHandler);


// ==========================================
// Database Connection & Server Initialization
// ==========================================

// Run environment validation before starting
checkRequiredEnvVars();

const PORT = process.env.PORT || 5000;
const MODE = process.env.NODE_ENV || 'development';

let server;

// Connect to MongoDB Atlas, then start listening
connectDB().then(() => {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${MODE} mode`);
  });
});

// Graceful shutdown handling
const shutdown = (signal) => {
  console.log(`\nReceived ${signal}. Server shutting down gracefully.`);
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

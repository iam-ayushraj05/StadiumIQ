/**
 * StadiumIQ Backend Server
 * GenAI-powered Smart Stadium Operations — FIFA World Cup 2026
 * Node.js / Express + Google Gemini AI
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import route modules
import aiRoutes from './routes/ai.js';
import crowdRoutes from './routes/crowd.js';
import navigationRoutes from './routes/navigation.js';
import transportRoutes from './routes/transport.js';
import sustainabilityRoutes from './routes/sustainability.js';
import operationsRoutes from './routes/operations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "*"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// ─── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., file://, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true
}));

// ─── Rate Limiting ──────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again shortly.' }
});

const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit reached. Please wait before sending more requests.' }
});

app.use(generalLimiter);

// ─── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Logging ────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ─── Health Check ───────────────────────────────────────────────────────────
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({
    status: 'ok',
    service: 'StadiumIQ API',
    version: '1.0.0',
    event: 'FIFA World Cup 2026',
    timestamp: new Date().toISOString(),
    gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured'
  });
});

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/crowd', crowdRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/sustainability', sustainabilityRoutes);
app.use('/api/operations', operationsRoutes);

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found', available: '/health, /api/ai, /api/crowd, /api/navigation, /api/transport, /api/sustainability, /api/operations' });
});

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────
const isMainModule = () => {
  if (!process.argv[1]) return false;
  const path = process.argv[1].replace(/\\/g, '/');
  return path.endsWith('server.js') || path.endsWith('nodemon/bin/nodemon.js') || path.endsWith('nodemon');
};

if (isMainModule()) {
  app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║   StadiumIQ API — FIFA World Cup 2026    ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? '✅ Ready' : '⚠️  No API key set'}`);
    console.log(`🌍 CORS Origins: ${allowedOrigins.join(', ')}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

export default app;

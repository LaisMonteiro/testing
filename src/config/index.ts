import dotenv from 'dotenv';
import { CoreConfig } from '../types';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  session: {
    secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
    timeout: parseInt(process.env.SESSION_TIMEOUT || '3600000', 10), // 1 hora
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_TIMEOUT || '3600000', 10)
    }
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },

  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8080', 'http://localhost:3000'],
    credentials: true
  }
};

export const coreConfigs: CoreConfig[] = [
  {
    name: 'core-api-1',
    url: process.env.CORE_API_1_URL || 'http://localhost:4001',
    healthCheck: '/health',
    weight: 1,
    isActive: true
  },
  {
    name: 'core-api-2', 
    url: process.env.CORE_API_2_URL || 'http://localhost:4002',
    healthCheck: '/health',
    weight: 1,
    isActive: true
  },
  {
    name: 'core-api-3',
    url: process.env.CORE_API_3_URL || 'http://localhost:4003',
    healthCheck: '/health',
    weight: 1,
    isActive: true
  }
];
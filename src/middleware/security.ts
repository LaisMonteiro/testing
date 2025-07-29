import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from '../config';

// Rate limiting
export const createRateLimit = (windowMs?: number, max?: number) => {
  return rateLimit({
    windowMs: windowMs || config.rateLimit.windowMs,
    max: max || config.rateLimit.max,
    message: {
      error: 'Too Many Requests',
      message: 'Muitas requisições. Tente novamente mais tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Pular rate limiting para health checks
      return req.path === '/proxy/health' || req.path === '/health';
    }
  });
};

// Rate limiting mais restritivo para login
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login por IP
  message: {
    error: 'Too Many Login Attempts',
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Configuração do Helmet para segurança
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
});

// Middleware para validar origem da requisição
export const validateOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin') || req.get('Referer');
  const userAgent = req.get('User-Agent') || '';
  
  // Log de requisições suspeitas
  if (!origin && !userAgent.includes('Flutter')) {
    console.warn(`Requisição suspeita de ${req.ip}: sem origem e não é Flutter`);
  }
  
  next();
};

// Middleware para detectar bots e crawlers
export const detectBots = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.get('User-Agent') || '';
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i
  ];
  
  const isBot = botPatterns.some(pattern => pattern.test(userAgent));
  
  if (isBot) {
    console.log(`Bot detectado: ${userAgent} de ${req.ip}`);
    res.status(403).json({
      error: 'Forbidden',
      message: 'Acesso negado para bots'
    });
    return;
  }
  
  next();
};

// Middleware para sanitização de headers
export const sanitizeHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remover headers potencialmente perigosos
  delete req.headers['x-forwarded-host'];
  delete req.headers['x-cluster-client-ip'];
  delete req.headers['x-real-ip'];
  
  // Garantir que certos headers estejam presentes
  if (!req.headers['x-forwarded-for']) {
    req.headers['x-forwarded-for'] = req.ip;
  }
  
  next();
};

// Middleware para logging de segurança
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const securityInfo = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin'),
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString()
  };
  
  // Log requisições para endpoints sensíveis
  if (req.path.includes('/auth/') || req.path.includes('/admin/')) {
    console.log(`[SECURITY] ${JSON.stringify(securityInfo)}`);
  }
  
  next();
};
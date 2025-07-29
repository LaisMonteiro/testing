import express from 'express';
import session from 'express-session';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config';
import { ProxyService } from './services/proxyService';
import { authLogger, optionalAuth } from './middleware/auth';
import { 
  createRateLimit, 
  loginRateLimit, 
  securityHeaders, 
  validateOrigin, 
  detectBots, 
  sanitizeHeaders, 
  securityLogger 
} from './middleware/security';

// Importar rotas
import authRoutes from './routes/auth';
import proxyRoutes from './routes/proxy';

const app = express();

// Trust proxy (importante para load balancers e reverse proxies)
app.set('trust proxy', 1);

// Middlewares de segurança
app.use(securityHeaders);
app.use(securityLogger);
app.use(sanitizeHeaders);
app.use(detectBots);
app.use(validateOrigin);

// Rate limiting global
app.use(createRateLimit());

// CORS
app.use(cors(config.cors));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Configuração de sessão
app.use(session({
  secret: config.session.secret,
  resave: config.session.resave,
  saveUninitialized: config.session.saveUninitialized,
  cookie: config.session.cookie,
  name: 'flutter-proxy-session'
}));

// Middleware de autenticação opcional para todas as rotas
app.use(optionalAuth);
app.use(authLogger);

// Rotas de autenticação com rate limiting específico
app.use('/auth/login', loginRateLimit);
app.use('/auth', authRoutes);

// Rotas de controle do proxy
app.use('/proxy', proxyRoutes);

// Health check simples
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Rota principal com informações da API
app.get('/', (req, res) => {
  res.json({
    name: 'Flutter Proxy Server',
    version: '1.0.0',
    description: 'Proxy server para aplicações Flutter com controle de sessão',
    endpoints: {
      health: '/health',
      auth: {
        login: 'POST /auth/login',
        logout: 'POST /auth/logout',
        me: 'GET /auth/me',
        status: 'GET /auth/status',
        refresh: 'POST /auth/refresh'
      },
      proxy: {
        status: 'GET /proxy/status',
        metrics: 'GET /proxy/metrics',
        healthCheck: 'POST /proxy/health-check'
      },
      api: '/api/* (proxied to cores)'
    },
    documentation: 'https://github.com/your-org/flutter-proxy-server'
  });
});

// Middleware de proxy inteligente para todas as rotas /api/*
app.use('/api', ProxyService.intelligentRouter());

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint não encontrado',
    path: req.originalUrl
  });
});

// Middleware de tratamento de erro global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro não tratado:', err);
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'Erro interno do servidor',
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
});

// Inicialização do servidor
const startServer = async () => {
  try {
    // Realizar health check inicial dos cores
    console.log('🔍 Verificando status dos cores...');
    await ProxyService.updateCoreStatuses();
    
    const coreStatuses = ProxyService.getCoreStatuses();
    const activeCores = coreStatuses.filter(c => c.isActive);
    
    console.log(`✅ ${activeCores.length}/${coreStatuses.length} cores ativos:`);
    coreStatuses.forEach(core => {
      const status = core.isActive ? '🟢' : '🔴';
      console.log(`   ${status} ${core.name}: ${core.url}`);
    });

    // Iniciar servidor
    const server = app.listen(config.port, () => {
      console.log(`🚀 Flutter Proxy Server rodando na porta ${config.port}`);
      console.log(`🔗 Environment: ${config.nodeEnv}`);
      console.log(`📋 Health check: http://localhost:${config.port}/health`);
      console.log(`📚 API Info: http://localhost:${config.port}/`);
    });

    // Health check periódico dos cores (a cada 30 segundos)
    setInterval(async () => {
      try {
        await ProxyService.updateCoreStatuses();
      } catch (error) {
        console.error('Erro no health check periódico:', error);
      }
    }, 30000);

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      
      server.close((err) => {
        if (err) {
          console.error('❌ Error during server shutdown:', err);
          process.exit(1);
        }
        
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Erro ao inicializar servidor:', error);
    process.exit(1);
  }
};

// Inicializar servidor
startServer();
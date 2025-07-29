import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/sessionService';

// Middleware para verificar se usuário está autenticado
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Verificar sessão
  if (req.session?.userId) {
    if (SessionService.isSessionValid(req.session)) {
      SessionService.updateLastActivity(req);
      return next();
    } else {
      // Sessão expirada
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        return res.status(401).json({
          error: 'Session Expired',
          message: 'Sessão expirada. Faça login novamente.'
        });
      });
      return;
    }
  }

  // Verificar JWT no header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = SessionService.verifyJWT(token);
    
    if (decoded) {
      req.user = decoded;
      return next();
    }
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Acesso negado. Autenticação necessária.'
  });
};

// Middleware para verificar permissões específicas
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = SessionService.getUserFromSession(req) || req.user;
    
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuário não autenticado.'
      });
      return;
    }

    if (!user.permissions?.includes(permission)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Permissão '${permission}' necessária.`
      });
      return;
    }

    next();
  };
};

// Middleware para verificar role específica
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = SessionService.getUserFromSession(req) || req.user;
    
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuário não autenticado.'
      });
      return;
    }

    if (user.role !== role) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Role '${role}' necessária.`
      });
      return;
    }

    next();
  };
};

// Middleware opcional de autenticação (não obrigatória)
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  // Tentar autenticar mas não bloquear se falhar
  if (req.session?.userId && SessionService.isSessionValid(req.session)) {
    SessionService.updateLastActivity(req);
    const user = SessionService.getUserFromSession(req);
    if (user) {
      req.user = user;
    }
  } else {
    // Tentar JWT
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = SessionService.verifyJWT(token);
      if (decoded) {
        req.user = decoded;
      }
    }
  }
  
  next();
};

// Middleware para logging de autenticação
export const authLogger = (req: Request, res: Response, next: NextFunction) => {
  const user = SessionService.getUserFromSession(req) || req.user;
  const userInfo = user ? `${user.username} (${user.role})` : 'anonymous';
  
  console.log(`[AUTH] ${req.method} ${req.path} - User: ${userInfo} - IP: ${req.ip}`);
  
  next();
};
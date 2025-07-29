import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { SessionService } from '../services/sessionService';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Schema de validação para login
const loginSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(3).required()
});

// Schema de validação para refresh token
const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// POST /auth/login - Realizar login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar dados de entrada
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Bad Request',
        message: error.details[0]?.message || 'Dados inválidos'
      });
      return;
    }

    const { username, password } = value;

    // Autenticar usuário
    const user = await SessionService.authenticate(username, password);
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Credenciais inválidas'
      });
      return;
    }

    // Criar sessão
    SessionService.createSession(req, user);

    // Gerar JWT
    const token = SessionService.generateJWT(user);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      },
      token,
      sessionId: req.sessionID
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro interno do servidor'
    });
  }
});

// POST /auth/logout - Realizar logout
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    await SessionService.destroySession(req, res);
    
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro interno do servidor'
    });
  }
});

// GET /auth/me - Obter informações do usuário autenticado
router.get('/me', requireAuth, (req: Request, res: Response): void => {
  try {
    const user = SessionService.getUserFromSession(req) || req.user;
    
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuário não autenticado'
      });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      },
      session: {
        lastActivity: req.session?.lastActivity,
        sessionId: req.sessionID
      }
    });

  } catch (error) {
    console.error('Erro ao obter informações do usuário:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro interno do servidor'
    });
  }
});

// POST /auth/refresh - Renovar token JWT
router.post('/refresh', (req: Request, res: Response): void => {
  try {
    const { error, value } = refreshSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Bad Request',
        message: error.details[0]?.message || 'Dados inválidos'
      });
      return;
    }

    const { refreshToken } = value;
    const decoded = SessionService.verifyJWT(refreshToken);
    
    if (!decoded) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token inválido'
      });
      return;
    }

    // Gerar novo token
    const newToken = SessionService.generateJWT({
      id: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      permissions: decoded.permissions || []
    });

    res.json({
      success: true,
      token: newToken
    });

  } catch (error) {
    console.error('Erro ao renovar token:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro interno do servidor'
    });
  }
});

// GET /auth/status - Verificar status da sessão
router.get('/status', (req: Request, res: Response) => {
  const isAuthenticated = !!(req.session?.userId || req.user);
  const user = SessionService.getUserFromSession(req) || req.user;
  
  res.json({
    isAuthenticated,
    user: user ? {
      id: user.id,
      username: user.username,
      role: user.role
    } : null,
    sessionValid: req.session?.userId ? SessionService.isSessionValid(req.session) : false
  });
});

export default router;
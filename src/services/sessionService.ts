import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { AuthUser, SessionData } from '../types';

export class SessionService {
  
  // Simular um banco de dados de usuários (em produção, usar um banco real)
  private static users: AuthUser[] = [
    {
      id: '1',
      username: 'admin',
      role: 'admin',
      permissions: ['read', 'write', 'delete']
    },
    {
      id: '2', 
      username: 'user',
      role: 'user',
      permissions: ['read']
    }
  ];

  // Simular senhas hashadas (em produção, armazenar no banco)
  private static passwords: Record<string, string> = {
    'admin': '$2a$10$XYZ...', // senha: admin123
    'user': '$2a$10$ABC...'   // senha: user123
  };

  static async authenticate(username: string, password: string): Promise<AuthUser | null> {
    const user = this.users.find(u => u.username === username);
    if (!user) return null;

    const hashedPassword = this.passwords[username];
    if (!hashedPassword) return null;

    // Em produção, usar bcrypt.compare(password, hashedPassword)
    // Por simplicidade, aqui fazemos uma comparação direta
    if (username === 'admin' && password === 'admin123') return user;
    if (username === 'user' && password === 'user123') return user;
    
    return null;
  }

  static generateJWT(user: AuthUser): string {
    const payload = { 
      userId: user.id, 
      username: user.username, 
      role: user.role 
    };
    
    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as any);
  }

  static verifyJWT(token: string): any {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch {
      return null;
    }
  }

  static createSession(req: Request, user: AuthUser): void {
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.lastActivity = new Date();
    req.session.preferences = {};
  }

  static destroySession(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) reject(err);
        else {
          res.clearCookie('connect.sid');
          resolve();
        }
      });
    });
  }

  static isSessionValid(sessionData: SessionData): boolean {
    if (!sessionData.userId || !sessionData.lastActivity) return false;
    
    const now = new Date().getTime();
    const lastActivity = new Date(sessionData.lastActivity).getTime();
    const timeoutMs = config.session.timeout;
    
    return (now - lastActivity) < timeoutMs;
  }

  static updateLastActivity(req: Request): void {
    if (req.session.userId) {
      req.session.lastActivity = new Date();
    }
  }

  static getUserFromSession(req: Request): AuthUser | null {
    if (!req.session.userId) return null;
    
    return this.users.find(u => u.id === req.session.userId) || null;
  }
}
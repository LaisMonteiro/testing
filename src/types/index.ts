export interface ProxyConfig {
  target: string;
  changeOrigin: boolean;
  pathRewrite?: Record<string, string>;
  timeout?: number;
}

export interface CoreConfig {
  name: string;
  url: string;
  healthCheck: string;
  weight: number;
  isActive: boolean;
}

export interface SessionData {
  userId?: string;
  userRole?: string;
  preferences?: Record<string, any>;
  lastActivity?: Date;
}

export interface RequestMetrics {
  requestId: string;
  method: string;
  path: string;
  targetCore: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  permissions: string[];
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userRole?: string;
    preferences?: Record<string, any>;
    lastActivity?: Date;
  }
}
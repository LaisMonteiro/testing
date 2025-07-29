import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { CoreConfig, RequestMetrics } from '../types';
import { coreConfigs } from '../config';
import { v4 as uuidv4 } from 'uuid';

export class ProxyService {
  private static activeConfigs: CoreConfig[] = coreConfigs.filter(config => config.isActive);
  private static requestMetrics: RequestMetrics[] = [];
  private static currentCoreIndex = 0;

  // Health check para monitorar status dos cores
  static async checkCoreHealth(coreConfig: CoreConfig): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${coreConfig.url}${coreConfig.healthCheck}`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error(`Health check failed for ${coreConfig.name}:`, error);
      return false;
    }
  }

  // Atualizar status dos cores baseado em health checks
  static async updateCoreStatuses(): Promise<void> {
    for (const config of coreConfigs) {
      const isHealthy = await this.checkCoreHealth(config);
      config.isActive = isHealthy;
    }
    this.activeConfigs = coreConfigs.filter(config => config.isActive);
  }

  // Selecionar core usando round-robin com weight
  static selectCore(req: Request): CoreConfig | null {
    if (this.activeConfigs.length === 0) {
      return null;
    }

    // Implementação simples de round-robin
    const selectedCore = this.activeConfigs[this.currentCoreIndex % this.activeConfigs.length];
    this.currentCoreIndex++;
    
    return selectedCore || null;
  }

  // Selecionar core baseado em critérios específicos (exemplo: baseado no userId)
  static selectCoreByUser(userId: string): CoreConfig | null {
    if (this.activeConfigs.length === 0) return null;

    // Estratégia: direcionar baseado no hash do userId para consistência
    const hash = this.simpleHash(userId);
    const coreIndex = hash % this.activeConfigs.length;
    return this.activeConfigs[coreIndex] || null;
  }

  // Selecionar core baseado no path da requisição
  static selectCoreByPath(path: string): CoreConfig | null {
    if (this.activeConfigs.length === 0) return null;

    // Estratégias baseadas no path
    if (path.startsWith('/api/v1')) {
      return this.activeConfigs.find(c => c.name === 'core-api-1') || this.selectCore({} as Request);
    }
    if (path.startsWith('/api/v2')) {
      return this.activeConfigs.find(c => c.name === 'core-api-2') || this.selectCore({} as Request);
    }
    if (path.startsWith('/api/v3')) {
      return this.activeConfigs.find(c => c.name === 'core-api-3') || this.selectCore({} as Request);
    }

    // Fallback para round-robin
    return this.selectCore({} as Request);
  }

  // Criar middleware de proxy para um core específico
  static createProxyMiddleware(targetCore: CoreConfig): any {
    const proxyOptions: Options = {
      target: targetCore.url,
      changeOrigin: true,
      timeout: 30000,
      proxyTimeout: 30000,
      
      // Log de requisições
      onProxyReq: (proxyReq, req: Request, res) => {
        const requestId = uuidv4();
        req.headers['x-request-id'] = requestId;
        req.headers['x-forwarded-for'] = req.ip;
        req.headers['x-proxy-source'] = 'flutter-proxy-server';
        
        console.log(`[${requestId}] Proxying ${req.method} ${req.path} to ${targetCore.name}`);
      },
      
      // Log de respostas
      onProxyRes: (proxyRes, req: Request, res) => {
        const requestId = req.headers['x-request-id'] as string;
        const startTime = Date.now();
        
        console.log(`[${requestId}] Response from ${targetCore.name}: ${proxyRes.statusCode}`);
        
        // Registrar métricas
        const metrics: RequestMetrics = {
          requestId,
          method: req.method,
          path: req.path,
          targetCore: targetCore.name,
          responseTime: Date.now() - startTime,
          statusCode: proxyRes.statusCode || 0,
          timestamp: new Date()
        };
        
        this.requestMetrics.push(metrics);
        
        // Manter apenas as últimas 1000 métricas
        if (this.requestMetrics.length > 1000) {
          this.requestMetrics = this.requestMetrics.slice(-1000);
        }
      },
      
      // Tratamento de erros
      onError: (err, req: Request, res: Response) => {
        const requestId = req.headers['x-request-id'] as string;
        console.error(`[${requestId}] Proxy error:`, err.message);
        
        res.status(502).json({
          error: 'Bad Gateway',
          message: 'Erro ao comunicar com o serviço de destino',
          requestId
        });
      }
    };

    return createProxyMiddleware(proxyOptions);
  }

  // Middleware principal de roteamento inteligente
  static intelligentRouter() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Atualizar health status periodicamente
        if (Math.random() < 0.1) { // 10% das requisições
          await this.updateCoreStatuses();
        }

        let selectedCore: CoreConfig | null = null;

        // Estratégia de seleção baseada em critérios
        if (req.session?.userId) {
          selectedCore = this.selectCoreByUser(req.session.userId);
        } else {
          selectedCore = this.selectCoreByPath(req.path);
        }

        if (!selectedCore) {
          res.status(503).json({
            error: 'Service Unavailable',
            message: 'Nenhum core disponível no momento'
          });
          return;
        }

        // Criar e executar proxy middleware
        const proxyMiddleware = this.createProxyMiddleware(selectedCore);
        proxyMiddleware(req, res, next);
        
      } catch (error) {
        console.error('Erro no roteamento inteligente:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Erro interno do servidor'
        });
      }
    };
  }

  // Função auxiliar para hash simples
  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Obter métricas de desempenho
  static getMetrics(): RequestMetrics[] {
    return this.requestMetrics;
  }

  // Obter status dos cores
  static getCoreStatuses(): CoreConfig[] {
    return coreConfigs;
  }
}
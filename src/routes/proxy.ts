import { Router, Request, Response } from 'express';
import { ProxyService } from '../services/proxyService';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth';

const router = Router();

// GET /proxy/status - Status dos cores (requer autenticação)
router.get('/status', requireAuth, (req: Request, res: Response) => {
  try {
    const coreStatuses = ProxyService.getCoreStatuses();
    
    res.json({
      success: true,
      cores: coreStatuses,
      activeCount: coreStatuses.filter(c => c.isActive).length,
      totalCount: coreStatuses.length
    });

  } catch (error) {
    console.error('Erro ao obter status dos cores:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro interno do servidor'
    });
  }
});

// GET /proxy/metrics - Métricas de desempenho (apenas admin)
router.get('/metrics', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  try {
    const metrics = ProxyService.getMetrics();
    
    // Calcular estatísticas
    const totalRequests = metrics.length;
    const avgResponseTime = totalRequests > 0 
      ? metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests 
      : 0;
    
    const statusCodeCounts = metrics.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const coreUsage = metrics.reduce((acc, m) => {
      acc[m.targetCore] = (acc[m.targetCore] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      summary: {
        totalRequests,
        avgResponseTime: Math.round(avgResponseTime),
        statusCodeCounts,
        coreUsage
      },
      recentMetrics: metrics.slice(-50) // Últimas 50 requisições
    });

  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro interno do servidor'
    });
  }
});

// POST /proxy/health-check - Forçar health check dos cores (apenas admin)
router.post('/health-check', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    await ProxyService.updateCoreStatuses();
    const coreStatuses = ProxyService.getCoreStatuses();
    
    res.json({
      success: true,
      message: 'Health check executado com sucesso',
      cores: coreStatuses
    });

  } catch (error) {
    console.error('Erro no health check:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro interno do servidor'
    });
  }
});

// GET /proxy/health - Health check público do proxy
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
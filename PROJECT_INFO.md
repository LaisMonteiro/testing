# Flutter Proxy Server - Informações do Projeto

## 🎯 Objetivo

Este projeto implementa um servidor proxy Node.js com TypeScript que atua como intermediário entre aplicações Flutter e múltiplos cores de API, oferecendo:

- **Roteamento Inteligente**: Distribui requisições entre diferentes cores
- **Controle de Sessão**: Sistema completo de autenticação e autorização
- **Segurança**: Implementa múltiplas camadas de segurança
- **Monitoramento**: Health checks e métricas de performance
- **Azure DevOps Ready**: Pipeline CI/CD configurado

## 🏛️ Arquitetura do Sistema

```
Flutter App
    ↓
[Flutter Proxy Server] ← Este projeto
    ↓ ↓ ↓
Core API 1   Core API 2   Core API 3
```

### Estratégias de Roteamento

1. **Por Path**: `/api/v1/*` → Core 1, `/api/v2/*` → Core 2, etc.
2. **Por Usuário**: Hash do userId para distribuição consistente
3. **Round-Robin**: Distribuição circular automática
4. **Health-Based**: Apenas cores saudáveis recebem tráfego

## 🔐 Sistema de Autenticação

### Duplo Sistema
- **Sessões**: Para aplicações web tradicionais
- **JWT**: Para aplicações mobile (Flutter)

### Usuários Padrão
```
admin / admin123 (role: admin)
user / user123 (role: user)
```

## 🚀 Como Usar

### Desenvolvimento
```bash
npm install
cp .env.example .env
npm run dev
```

### Produção
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t flutter-proxy .
docker run -p 3000:3000 flutter-proxy
```

## 🔧 Configuração dos Cores

Edite `src/config/index.ts` para configurar seus cores:

```typescript
export const coreConfigs: CoreConfig[] = [
  {
    name: 'core-api-1',
    url: 'https://api1.sua-empresa.com',
    healthCheck: '/health',
    weight: 1,
    isActive: true
  }
  // ... mais cores
];
```

## 📊 Monitoramento

### Endpoints de Monitoramento
- `GET /health` - Health check do proxy
- `GET /proxy/health` - Health check público
- `GET /proxy/status` - Status dos cores (auth required)
- `GET /proxy/metrics` - Métricas detalhadas (admin only)

### Logs Estruturados
O sistema gera logs estruturados com:
- Request ID único
- Tempo de resposta
- Core de destino
- Status codes
- Informações de segurança

## ☁️ Deploy Azure

### Pré-requisitos
1. Azure Container Registry configurado
2. Service Connection com Azure
3. Variáveis secretas configuradas:
   - `SESSION_SECRET`
   - `JWT_SECRET`
   - `ACR_USERNAME`
   - `ACR_PASSWORD`

### Pipeline Automático
- **main** → Production
- **develop** → Staging
- **feature/**** → Development

## 🛡️ Segurança

### Implementado
✅ Rate Limiting configurável
✅ CORS policy
✅ Helmet security headers
✅ JWT token expiration
✅ Session timeout
✅ Request sanitization
✅ Bot detection
✅ Input validation (Joi)

### Para Produção
- [ ] HTTPS obrigatório
- [ ] Redis para sessões distribuídas
- [ ] Backup de sessões
- [ ] Monitoring avançado
- [ ] Firewall configurado

## 🧪 Testando a API

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Usando JWT
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/proxy/status
```

### Teste de Proxy
```bash
curl http://localhost:3000/api/v1/qualquer-rota
# → Será redirecionado para Core 1
```

## 📈 Métricas Disponíveis

- Total de requisições
- Tempo de resposta médio
- Distribuição de status codes
- Uso por core
- Últimas requisições

## 🔄 Ciclo de Vida das Requisições

1. **Entrada**: Middleware de segurança
2. **Autenticação**: Verificação de sessão/JWT
3. **Roteamento**: Seleção inteligente do core
4. **Proxy**: Encaminhamento da requisição
5. **Resposta**: Logging e métricas
6. **Saída**: Response para o cliente

## 📞 Suporte

Para questões específicas deste projeto:
- Documentação: `README.md`
- Issues: GitHub Issues
- Logs: Verificar console em desenvolvimento

---

**Status**: ✅ Pronto para produção
**Versão**: 1.0.0
**Última atualização**: $(date)
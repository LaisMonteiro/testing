# Flutter Proxy Server

Um servidor proxy Node.js com TypeScript projetado para aplicações Flutter, oferecendo roteamento inteligente, controle de sessão e integração com Azure DevOps.

## 🚀 Características

- **Proxy Inteligente**: Roteamento automático para múltiplos cores de API
- **Controle de Sessão**: Sistema completo de autenticação e autorização
- **Segurança**: Rate limiting, CORS, Helmet, sanitização de headers
- **Monitoramento**: Health checks automáticos e métricas de performance
- **Azure DevOps**: Pipeline CI/CD completo configurado
- **Docker**: Containerização otimizada para produção
- **TypeScript**: Tipagem estática e desenvolvimento robusto

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Docker (opcional)
- Azure CLI (para deploy)

## 🛠️ Instalação

### Desenvolvimento Local

```bash
# Clonar o repositório
git clone <your-repo-url>
cd flutter-proxy-server

# Instalar dependências
npm install

# Copiar e configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Iniciar em modo desenvolvimento
npm run dev
```

### Docker

```bash
# Build da imagem
docker build -t flutter-proxy-server .

# Executar container
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e SESSION_SECRET=your-secret \
  -e JWT_SECRET=your-jwt-secret \
  flutter-proxy-server
```

## ⚙️ Configuração

### Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```env
# Servidor
PORT=3000
NODE_ENV=development

# Sessão
SESSION_SECRET=your-super-secret-session-key
SESSION_TIMEOUT=3600000

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h

# Cores de API
CORE_API_1_URL=http://localhost:4001
CORE_API_2_URL=http://localhost:4002
CORE_API_3_URL=http://localhost:4003

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:3000
```

### Configuração dos Cores

Os cores de API são configurados em `src/config/index.ts`. Por padrão, o sistema espera:

- **Core 1**: Rotas `/api/v1/*`
- **Core 2**: Rotas `/api/v2/*` 
- **Core 3**: Rotas `/api/v3/*`

## 🏗️ Arquitetura

```
src/
├── config/          # Configurações centralizadas
├── middleware/      # Middlewares de autenticação e segurança
├── routes/          # Rotas de API
├── services/        # Lógica de negócio
├── types/           # Definições TypeScript
├── utils/           # Utilitários
└── index.ts         # Arquivo principal
```

### Fluxo de Requisições

1. **Middleware de Segurança**: Rate limiting, CORS, headers
2. **Autenticação Opcional**: Verificação de sessão/JWT
3. **Roteamento Inteligente**: Seleção automática do core
4. **Proxy**: Encaminhamento para o core selecionado
5. **Logging**: Registro de métricas e logs

## 🔐 Autenticação

### Login

```bash
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Usuários padrão:**
- `admin` / `admin123` (role: admin)
- `user` / `user123` (role: user)

### Usar JWT Token

```bash
Authorization: Bearer <your-jwt-token>
```

### Logout

```bash
POST /auth/logout
Authorization: Bearer <your-jwt-token>
```

## 🛣️ API Endpoints

### Autenticação
- `POST /auth/login` - Realizar login
- `POST /auth/logout` - Realizar logout
- `GET /auth/me` - Informações do usuário
- `GET /auth/status` - Status da sessão
- `POST /auth/refresh` - Renovar token

### Proxy
- `GET /proxy/status` - Status dos cores (requer auth)
- `GET /proxy/metrics` - Métricas (apenas admin)
- `POST /proxy/health-check` - Forçar health check (apenas admin)
- `GET /proxy/health` - Health check público

### API Routes
- `ALL /api/*` - Proxied para cores de API

### Sistema
- `GET /health` - Health check do servidor
- `GET /` - Informações da API

## 🔄 Estratégias de Roteamento

O proxy utiliza as seguintes estratégias para selecionar o core:

1. **Por Path**: Baseado no prefixo da rota (`/api/v1`, `/api/v2`, etc.)
2. **Por Usuário**: Hash do userId para distribuição consistente
3. **Round-Robin**: Distribuição circular quando outras estratégias falham
4. **Health-Based**: Apenas cores saudáveis são utilizados

## 📊 Monitoramento

### Health Checks

- **Automático**: A cada 30 segundos
- **Manual**: `POST /proxy/health-check`
- **Público**: `GET /proxy/health`

### Métricas

Acesse `GET /proxy/metrics` (apenas admin) para:

- Total de requisições
- Tempo de resposta médio
- Distribuição de códigos de status
- Uso por core
- Últimas 50 requisições

## 🐳 Docker

### Build Local

```bash
docker build -t flutter-proxy-server .
```

### Multi-stage Build

O Dockerfile utiliza multi-stage build para otimização:

1. **Builder**: Instala dependências e faz build
2. **Production**: Imagem final otimizada com usuário não-root

### Health Check

Container inclui health check automático:

```bash
docker ps  # Verificar status (healthy/unhealthy)
```

## ☁️ Azure DevOps

### Pipeline

O arquivo `azure-pipelines.yml` inclui:

1. **Build & Test**: Compilação, lint, testes
2. **Security Scan**: Auditoria de vulnerabilidades
3. **Docker Build**: Construção e push da imagem
4. **Deploy**: Deploy automático para Azure Container Instances

### Configuração

1. **Azure Container Registry**: Configure sua ACR
2. **Service Connections**: Configure conexão com Azure
3. **Variables**: Configure variáveis secretas:
   - `SESSION_SECRET`
   - `JWT_SECRET`
   - `ACR_USERNAME`
   - `ACR_PASSWORD`

### Ambientes

- **main** → Production
- **develop** → Staging  
- **feature*** → Development

## 🔒 Segurança

### Implementado

- Rate limiting configurable
- CORS policy
- Helmet security headers
- JWT token expiration
- Session timeout
- Request sanitization
- Bot detection
- Input validation (Joi)

### Recomendações para Produção

1. Use HTTPS sempre
2. Configure secrets adequadamente
3. Monitore logs de segurança
4. Implemente backup de sessões
5. Use Redis para sessões em cluster
6. Configure firewall adequado

## 🧪 Testes

```bash
# Executar testes
npm test

# Coverage
npm run test:coverage

# Lint
npm run lint
```

## 📦 Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento com hot-reload
npm run build        # Build para produção
npm start           # Iniciar aplicação
npm run lint        # Verificar código
npm test            # Executar testes
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Changelog

### v1.0.0
- Implementação inicial
- Sistema de proxy inteligente
- Controle de sessão completo
- Integração com Azure DevOps
- Containerização Docker

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

Para questões e suporte:

- Abra uma [issue](https://github.com/your-org/flutter-proxy-server/issues)
- Entre em contato: your-email@company.com

---

**Desenvolvido com ❤️ para aplicações Flutter**
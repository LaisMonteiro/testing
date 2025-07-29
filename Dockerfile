# Multi-stage build para otimizar tamanho da imagem
FROM node:18-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Stage de produção
FROM node:18-alpine AS production

# Instalar dumb-init para handling de sinais
RUN apk add --no-cache dumb-init

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar dependências do stage builder
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules

# Copiar build da aplicação
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/package*.json ./

# Criar arquivo .env vazio (será populado via variáveis de ambiente)
RUN touch .env && chown appuser:nodejs .env

# Mudar para usuário não-root
USER appuser

# Expor porta
EXPOSE 3000

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { \
    if (res.statusCode === 200) { process.exit(0); } else { process.exit(1); } \
  }).on('error', () => process.exit(1));"

# Comando de inicialização com dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
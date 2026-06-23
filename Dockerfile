# ==========================================
# Fase 1: Build do Frontend (React/Vite)
# ==========================================
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Copiar arquivos de dependências
COPY frontend/package*.json ./

# Instalar dependências
RUN npm install

# Copiar o resto do código e compilar
COPY frontend/ ./
RUN npm run build

# ==========================================
# Fase 2: Ambiente de Produção (Backend Express)
# ==========================================
FROM node:18-alpine
WORKDIR /app/backend

# Instalar postgresql-client nativo (CRÍTICO para o sistema de Backup/Restore via UI rodar pg_dump)
RUN apk add --no-cache postgresql-client

# Copiar arquivos de dependências
COPY backend/package*.json ./

# Instalar apenas as dependências de produção do Node.js
RUN npm install --omit=dev

# Copiar o resto do código-fonte do backend
COPY backend/ ./

# Copiar a compilação do frontend estático da Fase 1 para a estrutura esperada pelo backend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Criar os diretórios para garantir que as permissões de volume existam
RUN mkdir -p /app/backend/uploads && mkdir -p /app/backups

# Expor a porta em que a aplicação vai rodar
EXPOSE 5000

# Variáveis de ambiente padrão
ENV PORT=5000
ENV NODE_ENV=production

# Iniciar o servidor
CMD ["npm", "run", "start"]

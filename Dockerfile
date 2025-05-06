# Etapa de build
FROM node:22.0.0 AS builder

# Define o diretório de trabalho
WORKDIR /app
# Copia os arquivos do projeto
COPY . .
# Instala o pnpm globalmente
RUN npm i -g pnpm
# Instala dependências
RUN pnpm install
# Compila o projeto NestJS
RUN pnpm build

# Etapa final
FROM builder

WORKDIR /app

# Copia apenas os arquivos necessários da build anterior
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

# Expõe a porta usada no Nest
EXPOSE 3000

# Define a variável de ambiente da porta
ENV PORT=3000

# Comando para iniciar a aplicação
CMD ["node", "dist/main"]

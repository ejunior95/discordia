# build
FROM node:18 AS builder

WORKDIR /app

COPY . .

RUN npm i -g pnpm \
    && pnpm install \
    && pnpm run build

# imagem final
FROM node:18

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/main.js"]
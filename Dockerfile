FROM node:22-slim AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY package.json .
COPY pnpm-lock.yaml .
COPY tsconfig.json .

RUN pnpm install --frozen-lockfile

COPY src/ ./src/

RUN pnpm run server:build

FROM node:22-slim

WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/build/ ./build/
COPY --from=builder /app/node_modules ./node_modules

RUN chown -R appuser:appgroup /app

USER appuser

ENV NODE_ENV=production

CMD ["node", "./build/index.js"]
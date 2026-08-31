FROM node:22-alpine AS base

FROM base AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG NEXT_PUBLIC_FRONTEND_BASE_URL
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_FRONTEND_BASE_URL=${NEXT_PUBLIC_FRONTEND_BASE_URL} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NODE_ENV=production

RUN npm run build

FROM base AS runner

ARG NEXT_PUBLIC_PORT=3135

ENV NODE_ENV=production \
    PORT=${NEXT_PUBLIC_PORT} \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3135

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3135').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

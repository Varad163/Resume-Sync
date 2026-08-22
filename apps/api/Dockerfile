# The API image: node plus one bundled script.
FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN node scripts/bundle.mjs api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Only the modules the bundle keeps external.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /build/apps/api/dist ./dist
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:8787/health || exit 1
CMD ["node", "dist/main.js"]

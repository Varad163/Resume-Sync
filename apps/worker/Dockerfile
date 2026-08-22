# The worker image. `git` is required: the worker clones the repositories it
# scans into ephemeral storage and deletes them when the scan ends.
FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN node scripts/bundle.mjs worker

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache git ca-certificates
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /build/apps/worker/dist ./dist
USER node
CMD ["node", "dist/main.js"]

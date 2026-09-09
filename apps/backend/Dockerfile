FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --include=dev

COPY apps/backend apps/backend
COPY packages/shared packages/shared

RUN npm run build -w @patrol/shared \
    && npm run build -w @patrol/backend

FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --omit=dev \
    && npm cache clean --force

COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/packages/shared/dist packages/shared/dist

RUN mkdir -p /app/storage \
    && chown node:node /app/storage

USER node

EXPOSE 3000

CMD ["npm", "run", "start", "-w", "@patrol/backend"]

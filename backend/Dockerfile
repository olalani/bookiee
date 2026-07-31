# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Delete lockfile to avoid conflicts, install all deps
RUN rm -f package-lock.json
RUN npm install

COPY . .

RUN npx prisma generate
RUN node_modules/.bin/nest build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

RUN npm prune --production && npm cache clean --force

EXPOSE 3001

CMD ["node", "dist/main"]

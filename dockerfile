# Stage 1: dependencies
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm install

# Stage 2: dev
FROM node:20-alpine AS dev
WORKDIR /app
RUN apk add --no-cache bash

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy source code และ config เท่านั้น
COPY src ./src
COPY tsconfig*.json ./

RUN npm install -g ts-node-dev
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

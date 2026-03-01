FROM rust:1.74-slim as wasm-builder

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

WORKDIR /build
COPY native/audio-processor ./native/audio-processor

RUN cd native/audio-processor && wasm-pack build --target web --out-dir ../../wasm

# Node.js build stage
FROM node:20-slim as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY --from=wasm-builder /build/wasm ./wasm

RUN npm run build:ts

# Production stage
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/wasm ./wasm
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]

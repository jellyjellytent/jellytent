FROM rust:1.74-slim as wasm-builder

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

WORKDIR /build
COPY native/audio-processor ./native/audio-processor

RUN cd native/audio-processor && wasm-pack build --target web --out-dir ../../wasm --release

# Python ML builder
FROM python:3.11-slim as python-builder

WORKDIR /build
COPY python ./python

RUN pip install --no-cache-dir build && \
    cd python && python -m build --wheel

# Node.js build stage
FROM node:20-slim as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --production=false

COPY tsconfig.json tsup.config.ts ./
COPY src ./src
COPY --from=wasm-builder /build/wasm ./wasm

RUN npm run build:ts && \
    npm prune --production

# Production stage
FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user
RUN groupadd -r jellytent && useradd -r -g jellytent jellytent

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/wasm ./wasm
COPY --from=builder /app/node_modules ./node_modules
COPY --from=python-builder /build/python/dist/*.whl /tmp/
COPY package*.json ./

RUN pip3 install --no-cache-dir /tmp/*.whl && rm /tmp/*.whl

# Set ownership
RUN chown -R jellytent:jellytent /app

USER jellytent

ENV NODE_ENV=production
ENV LOG_LEVEL=info

EXPOSE 8080 9090

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]

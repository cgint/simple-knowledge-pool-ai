## Stage 1: Build the SvelteKit application (adapter-node)
FROM node:20-slim AS builder

WORKDIR /app

# Copy lockfiles for better layer caching
COPY package*.json ./

# Install dependencies (dev deps needed for build)
RUN npm ci

# Copy the full project (SvelteKit needs configs/public/etc. at build time)
COPY . .

# Build the app (expects adapter-node configured; outputs to build/)
RUN npm run build

# Keep only production dependencies for the runtime image
RUN npm prune --production

## Stage 2: Run the built app
FROM node:20-slim

WORKDIR /app

# Optional: PDF tooling required by the upload route (wkhtmltopdf first, then fonts)
RUN apt-get update \
    && apt-get install -y --no-install-recommends wkhtmltopdf fontconfig fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

# Copy only what is needed to run the server
COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json .

# Ensure runtime-writable data directories used by the app
RUN mkdir -p /app/data/uploads /app/data/chat-history \
    && chown -R node:node /app/data
USER node

# Environment and port
ENV NODE_ENV=production
ARG PORT
ENV PORT=${PORT:-3000}
EXPOSE ${PORT}

# Start SvelteKit adapter-node server
CMD ["node", "build"]
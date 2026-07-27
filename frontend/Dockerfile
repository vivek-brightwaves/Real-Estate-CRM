FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies needed for build)
RUN npm ci && npm cache clean --force

# Copy application files
COPY . .

# Build application
RUN npm run build

# Remove dev dependencies to reduce final image size
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "start"]

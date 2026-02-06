# Build stage
FROM node:20-alpine AS builder

ARG API_URL=http://localhost:3000/api/v1

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build:prod

# Production stage - nginx
FROM nginx:alpine AS production

# Copy custom nginx config (__API_IP__ replaced at runtime)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy built assets from builder
COPY --from=builder /app/dist/circle-hours-web/browser /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

ENTRYPOINT ["/entrypoint.sh"]

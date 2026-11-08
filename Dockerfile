# Multi-stage build for unified frontend + backend
FROM node:18-alpine as frontend-build

# Set npm config to force Linux platform
ENV npm_config_platform=linux
ENV npm_config_arch=x64

# Set working directory for frontend build
WORKDIR /app/frontend

# Copy frontend package files (without lock file to avoid platform conflicts)
COPY frontend/package.json ./

# Install frontend dependencies with legacy peer deps to handle React 19 compatibility
RUN npm install --legacy-peer-deps 

# Copy frontend source code
COPY frontend/ .

# Build the frontend with environment variables
ARG VITE_API_URL
ARG VITE_EMAILJS_PUBLIC_KEY
ARG VITE_EMAILJS_SERVICE_ID
ARG VITE_EMAILJS_TEMPLATE_ID
ARG VITE_EMAILJS_CAREERS_TEMPLATE_ID
ARG VITE_AMWAL_ENVIRONMENT

ENV VITE_API_URL=${VITE_API_URL:-/api}
ENV VITE_EMAILJS_PUBLIC_KEY=${VITE_EMAILJS_PUBLIC_KEY}
ENV VITE_EMAILJS_SERVICE_ID=${VITE_EMAILJS_SERVICE_ID}
ENV VITE_EMAILJS_TEMPLATE_ID=${VITE_EMAILJS_TEMPLATE_ID}
ENV VITE_EMAILJS_CAREERS_TEMPLATE_ID=${VITE_EMAILJS_CAREERS_TEMPLATE_ID}
ENV VITE_AMWAL_ENVIRONMENT=${VITE_AMWAL_ENVIRONMENT}

# Debug: Print the environment variables during build
RUN echo "Building frontend with VITE_API_URL: $VITE_API_URL"
RUN echo "EmailJS variables configured: PUBLIC_KEY=${VITE_EMAILJS_PUBLIC_KEY:+SET} SERVICE_ID=${VITE_EMAILJS_SERVICE_ID:+SET} TEMPLATE_ID=${VITE_EMAILJS_TEMPLATE_ID:+SET}"

RUN npm run build

# Backend stage
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies including nginx and fonts for PDF generation
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        nginx \
        supervisor \
        fonts-dejavu \
        fonts-liberation \
        fontconfig \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f -v

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from frontend-build stage
COPY --from=frontend-build /app/frontend/dist /var/www/html

# Copy nginx configuration for serving frontend
COPY nginx.conf /etc/nginx/sites-available/default

# Create startup script to run both services
RUN echo '#!/bin/bash' > /app/start.sh \
    && echo 'set -e' >> /app/start.sh \
    && echo '' >> /app/start.sh \
    && echo '# Start nginx in background' >> /app/start.sh \
    && echo 'echo "Starting nginx..."' >> /app/start.sh \
    && echo 'nginx -g "daemon off;" &' >> /app/start.sh \
    && echo 'NGINX_PID=$!' >> /app/start.sh \
    && echo '' >> /app/start.sh \
    && echo '# Wait for nginx to start' >> /app/start.sh \
    && echo 'sleep 2' >> /app/start.sh \
    && echo '' >> /app/start.sh \
    && echo '# Start backend with health check' >> /app/start.sh \
    && echo 'echo "Starting FastAPI backend..."' >> /app/start.sh \
    && echo 'python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 1 &' >> /app/start.sh \
    && echo 'BACKEND_PID=$!' >> /app/start.sh \
    && echo '' >> /app/start.sh \
    && echo '# Wait for backend to start' >> /app/start.sh \
    && echo 'echo "Waiting for backend to be ready..."' >> /app/start.sh \
    && echo 'for i in {1..30}; do' >> /app/start.sh \
    && echo '  if curl -f http://localhost:8000/health > /dev/null 2>&1; then' >> /app/start.sh \
    && echo '    echo "Backend is ready!"' >> /app/start.sh \
    && echo '    break' >> /app/start.sh \
    && echo '  fi' >> /app/start.sh \
    && echo '  echo "Waiting for backend... attempt $i/30"' >> /app/start.sh \
    && echo '  sleep 2' >> /app/start.sh \
    && echo 'done' >> /app/start.sh \
    && echo '' >> /app/start.sh \
    && echo '# Keep container running and monitor processes' >> /app/start.sh \
    && echo 'wait $NGINX_PID $BACKEND_PID' >> /app/start.sh \
    && chmod +x /app/start.sh

# Create non-root user for security
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app \
    && chown -R appuser:appuser /var/www/html \
    && chown -R appuser:appuser /var/log \
    && chown -R appuser:appuser /etc/nginx \
    && chown -R appuser:appuser /etc/supervisor

# Expose port for nginx (Render expects 10000)
EXPOSE 10000

# Start both services using the startup script
CMD ["/app/start.sh"] 
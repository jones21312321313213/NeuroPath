# Stage 1: Build Vite React application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build-time API URL argument (defaults to relative /api if behind same reverse proxy)
ARG VITE_API_URL="http://localhost:8000/api"
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# Stage 2: Serve compiled assets with Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

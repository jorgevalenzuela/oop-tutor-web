# OOP Tutor — Frontend
# Multi-stage: build React app, serve with Nginx
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_RAG_API_URL=""
ARG VITE_ASSESSMENT_API_URL="/assessment"
ENV VITE_RAG_API_URL=$VITE_RAG_API_URL
ENV VITE_ASSESSMENT_API_URL=$VITE_ASSESSMENT_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

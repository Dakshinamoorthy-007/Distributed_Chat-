FROM node:22-alpine AS frontend-build
WORKDIR /frontend
COPY distributed-chat-frontend/package*.json ./
RUN npm install
COPY distributed-chat-frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY distributed-chat-backend/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend-build /frontend/dist /usr/share/nginx/html

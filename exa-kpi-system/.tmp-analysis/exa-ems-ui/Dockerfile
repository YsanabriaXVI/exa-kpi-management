# Production build: build with Node, serve with Nginx

FROM node:20-alpine AS build
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install --prefer-offline --no-audit --progress=false

# Build app (outDir is set to build in vite.config)
COPY . .
RUN npm run build

# Runtime image
FROM nginx:1.27-alpine
RUN apk add --no-cache gettext dos2unix
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN dos2unix /entrypoint.sh
RUN chmod +x /entrypoint.sh


EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]

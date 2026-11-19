FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY index.html tsconfig.json tailwind.config.js postcss.config.js vite.config.ts ./
COPY src ./src

RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

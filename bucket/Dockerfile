FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./

ENV BUCKET_STORAGE_DIR=/data
EXPOSE 3001

CMD ["node", "server.js"]

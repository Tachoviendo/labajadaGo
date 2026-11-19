FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

#la imagen de node ya trae el usuario "node": la api no corre como root
USER node

EXPOSE 3000

CMD ["node", "src/server.js"]

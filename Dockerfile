FROM node:22-alpine

WORKDIR /app

# Bağımlılıkları kopyala ve yükle
COPY package*.json ./
RUN npm install --production

# Uygulama kaynak kodlarını kopyala
COPY . .

# Storage klasörü için yetkiler
RUN mkdir -p storage/demos storage/temp_uploads

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "server/app.js"]

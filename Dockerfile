FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3   CMD node -e "require('./src/index.js')" || exit 1

CMD ["node", "src/index.js"]

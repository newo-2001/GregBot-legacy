FROM node:18-alpine

COPY . .
RUN npm install --omit=dev
ENTRYPOINT [ "node", "src/index.js" ]
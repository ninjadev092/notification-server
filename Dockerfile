FROM node:22.4.0-alpine

WORKDIR /app

COPY . .

RUN npm ci 

RUN npm i -g pm2

ENV $(cat .env | xargs)

EXPOSE 8001

CMD ["npm", "run", "start"]
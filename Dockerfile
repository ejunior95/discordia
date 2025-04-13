FROM node:latest

WORKDIR /src

COPY . .

RUN rm -rf node_modules
RUN npm i -g pnpm
RUN pnpm i

CMD ["npm", "start"]

EXPOSE 3000
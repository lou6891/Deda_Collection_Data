FROM node:14-alpine
WORKDIR /usr/src/app
RUN mkdir -p /usr/src/app
COPY . .
RUN npm install
EXPOSE 9000
CMD ["node", "index.js"]
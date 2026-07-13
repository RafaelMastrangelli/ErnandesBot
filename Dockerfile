FROM node:22-alpine

RUN apk add --no-cache git openssh-client \
  && mkdir -p /root/.ssh \
  && ssh-keyscan github.com >> /root/.ssh/known_hosts \
  && ssh-keyscan bitbucket.org >> /root/.ssh/known_hosts

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p src/workspace

ENV NODE_ENV=production

EXPOSE 3005

CMD ["node", "server.js"]

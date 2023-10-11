FROM node:18.3.0-alpine3.14

WORKDIR /app

COPY package.json .
COPY yarn.lock .

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn prisma:generate
RUN yarn build

RUN rm -rf node_modules
RUN rm tsconfig.json

RUN yarn install --production --frozen-lockfile

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
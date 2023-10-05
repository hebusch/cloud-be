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

RUN find src -mindepth 1 -maxdepth 1 ! -name db -exec rm -rf {} +

CMD ["yarn", "start"]
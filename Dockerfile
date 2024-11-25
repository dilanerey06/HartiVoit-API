FROM node:alpine
WORKDIR /usr/app/src
COPY package*.json ./
RUN npm install
RUN npm i -g nodemon
# COPY ./config ./config
# COPY ./routes ./routes
# COPY ./.gitignore ./
# COPY ./.env ./
# COPY ./app.js ./
# COPY ./clave.json ./
COPY . .
EXPOSE 30013
CMD ["nodemon", "app.js"]


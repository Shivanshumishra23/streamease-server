FROM ubuntu:focal

RUN apt-get update && \
    apt-get install -y curl && \
    curl -sL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y nodejs ffmpeg

WORKDIR /home/app

COPY . .

RUN npm install
RUN npm install -g nodemon

CMD nodemon src/index.js

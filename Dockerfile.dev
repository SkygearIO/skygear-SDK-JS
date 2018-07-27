FROM node:8

RUN \
    wget https://github.com/krallin/tini/releases/download/v0.13.0/tini && \
    mv tini /usr/local/bin/tini && \
    chmod +x /usr/local/bin/tini

RUN npm install -g npm@6.2.0

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV NODE_PATH /usr/local/lib/node_modules
ENTRYPOINT ["/usr/local/bin/tini", "--"]

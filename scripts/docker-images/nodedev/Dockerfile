FROM node:6

ENV TINI_VERSION v0.13.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini
ENTRYPOINT ["/tini", "--"]

RUN mkdir -p /go/src/app
WORKDIR /go/src/app

RUN mkdir -p /home/node && \
    chown -R node:node /home/node

USER node

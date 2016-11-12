FROM node:6

ENV TINI_VERSION v0.13.0
RUN \
  wget https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini && \
  chmod +x /tini && \
  mv tini /usr/local/bin/tini

ENTRYPOINT ["/usr/local/bin/tini", "--"]

RUN \
  mkdir -p /home/node && \
  chown -R node:node /home/node

WORKDIR /home/node

USER node

FROM node:6

RUN \
    wget https://github.com/krallin/tini/releases/download/v0.13.0/tini && \
    mv tini /usr/local/bin/tini && \
    chmod +x /usr/local/bin/tini

COPY skygear-*.tgz /tmp/
RUN find /tmp -name "skygear-*.tgz" -exec npm install -g "{}" \;

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
ENTRYPOINT ["/usr/local/bin/tini", "--"]
CMD ["skygear-node"]

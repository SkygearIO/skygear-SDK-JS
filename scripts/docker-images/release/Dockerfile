FROM node:6

RUN \
    wget https://github.com/krallin/tini/releases/download/v0.13.0/tini && \
    mv tini /usr/local/bin/tini && \
    chmod +x /usr/local/bin/tini

COPY skygear-*.tgz /tmp/
RUN find /tmp -regex ".*/skygear-core-[^-]*.tgz" -exec npm install -g "{}" \;
RUN find /tmp -regex ".*/skygear-[^-]*.tgz" -exec npm install -g "{}" \;

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
ENV NODE_PATH /usr/local/lib/node_modules
ENTRYPOINT ["/usr/local/bin/tini", "--"]
CMD ["skygear-node"]

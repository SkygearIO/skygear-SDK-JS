FROM node:8 as nodedev

RUN mkdir -p /usr/src/app /dist
WORKDIR /usr/src/app

COPY . .

RUN chown -R node:node /usr/src/app /dist

USER node

ARG version

RUN make vendor build VERSION=$version
RUN cp packages/*/*.tgz /dist

FROM node:6

RUN \
    wget https://github.com/krallin/tini/releases/download/v0.13.0/tini && \
    mv tini /usr/local/bin/tini && \
    chmod +x /usr/local/bin/tini && \
    mkdir -p /home/node /usr/src/app && \
    chown node:node /home/node /usr/src/app

COPY --from=nodedev /dist/ /dist/

USER node
WORKDIR /home/node
ENV NODE_PATH=/home/node/.local/lib/node_modules
ENV PATH=/usr/src/app/node_modules/.bin:/home/node/.local/bin:$PATH

RUN mkdir -p /home/node/.local/lib && \
    cd /home/node/.local/lib && \
    find /dist -regex ".*/skygear-core-[^-]*.tgz" -exec npm install "{}" \; && \
    find /dist -regex ".*/skygear-forgot-password-[^-]*.tgz" -exec npm install "{}" \; && \
    find /dist -regex ".*/skygear-sso-[^-]*.tgz" -exec npm install "{}" \; && \
    find /dist -regex ".*/skygear-[^-]*.tgz" -exec npm install "{}" \; && \
    mkdir -p /home/node/.local/bin && \
    cd /home/node/.local/bin && \
    find /home/node/.local/lib/node_modules/.bin/ -not -type d -exec sh -c 'ln -s {} $(basename {})' \;

WORKDIR /usr/src/app
ENTRYPOINT ["/usr/local/bin/tini", "--"]
CMD ["skygear-node"]

ONBUILD ARG NODE_ENV
ONBUILD ENV NODE_ENV $NODE_ENV
ONBUILD COPY package.json /usr/src/app/
ONBUILD RUN npm install
ONBUILD COPY . /usr/src/app

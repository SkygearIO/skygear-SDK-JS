# Skygear SDK for JavaScript

[![@skygear/web](https://img.shields.io/npm/v/@skygear/web.svg?label=@skygear/web)](https://www.npmjs.com/package/@skygear/web)
[![@skygear/web](https://img.shields.io/npm/dt/@skygear/web.svg?label=@skygear/web)](https://www.npmjs.com/package/@skygear/web)
[![@skygear/node-client](https://img.shields.io/npm/v/@skygear/node-client.svg?label=@skygear/node-client)](https://www.npmjs.com/package/@skygear/node-client)
[![@skygear/node-client](https://img.shields.io/npm/dt/@skygear/node-client.svg?label=@skygear/node-client)](https://www.npmjs.com/package/@skygear/node-client)
[![@skygear/react-native](https://img.shields.io/npm/v/@skygear/react-native.svg?label=@skygear/react-native)](https://www.npmjs.com/package/@skygear/react-native)
[![@skygear/react-native](https://img.shields.io/npm/dt/@skygear/react-native.svg?label=@skygear/react-native)](https://www.npmjs.com/package/@skygear/react-native)
[![Build Status](https://travis-ci.org/SkygearIO/skygear-SDK-JS.svg?branch=next)](https://travis-ci.org/SkygearIO/skygear-SDK-JS)
![License](https://img.shields.io/badge/license-Apache%202-blue)

## Documentation

View the API Reference at [https://skygeario.github.io/skygear-SDK-JS/](https://skygeario.github.io/skygear-SDK-JS/).

## Usage

### Web

```sh
$ npm install --save @skygear/web
```

### Node

```sh
$ npm install --save @skygear/node-client
```

### React Native

```sh
$ npm install --save @skygear/react-native
```

### Script Tag

[https://unpkg.com/@skygear/web@latest/dist/skygear-web.iife.js](https://unpkg.com/@skygear/web@latest/dist/skygear-web.iife.js)

Replace `latest` with the version you want to use.

## Running the example

The example assumes a local DNS server that is able to resolve `.localhost`. On macOS, you can install `dnsmasq`.

```sh
$ git clone --branch next https://github.com/SkygearIO/skygear-SDK-JS.git
$ cd skygear-SDK-JS
$ npm install
$ npm run lerna bootstrap
$ npm run build
$ npm run example
```

## Running example with custom gears endpoint
```
$ SKYGEAR_APP_ENDPOINT=<endpoint> \
$ SKYGEAR_AUTH_ENDPOINT=<auth_endpoint> \
$ SKYGEAR_ASSET_ENDPOINT=<asset_endpoint> \
$ SKYGEAR_CLIENT_ID=<clientid> \
$ npm run example
```

## Contributing

First, fork the repository.

```sh
$ git clone --branch next git@github.com:<myusername>/skygear-SDK-JS.git
$ cd skygear-SDK-JS
$ npm install
$ npm run lerna bootstrap
```

## Releasing

First, ensure `github-release` and `yarn` tool is installed.
Also, Git should be configured to be able to sign using GPG keys,
and npm should be logged in as appropriate user.

```sh
$ npm run prepare-new-release
# Edit the file new-release.
# It will be prepended to CHANGELOG.md
# So make sure the style is consistent.
$ vim new-release
$ GIT_USER=<github-username> GITHUB_TOKEN=<github-token> GIT_BRANCH=master SKYGEAR_VERSION=<new-version> ./scripts/release.sh
```

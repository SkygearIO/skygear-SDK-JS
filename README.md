# Skygear SDK for JavaScript

TODO: Badges

## Documentation

View the API Reference at [https://skygeario.github.io/skygear-SDK-JS/](https://skygeario.github.io/skygear-SDK-JS/).

## Usage

### Web

```sh
$ npm install --save @skygear/web
```

### Node

```sh
$ npm install --save @skygear/node
```

### React Native

```sh
$ npm install --save @skygear/react-native
```

### Script Tag

TODO

## Running the example

```sh
$ git clone --branch next https://github.com/SkygearIO/skygear-SDK-JS.git
$ cd skygear-SDK-JS
$ npm install
$ npm run lerna bootstrap
$ npm run build
$ SKYGEAR_ENDPOINT=<endpoint> SKYGEAR_API_KEY=<apikey> npm run example
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

```sh
$ npm run prepare-new-release
# Edit the file new-release.
# It will be prepended to CHANGELOG.md
# So make sure the style is consistent.
$ vim new-release
$ GIT_USER=<github-username> GITHUB_TOKEN=<github-token> GIT_BRANCH=next SKYGEAR_VERSION=<new-version> ./scripts/release.sh
```

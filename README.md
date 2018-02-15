# Skygear SDK for JS

[![npm](https://img.shields.io/npm/v/skygear.svg)](https://www.npmjs.com/package/skygear)
[![npm](https://img.shields.io/npm/dt/skygear.svg)](https://www.npmjs.com/package/skygear)
[![Build Status](https://travis-ci.org/SkygearIO/skygear-SDK-JS.svg?branch=master)](https://travis-ci.org/SkygearIO/skygear-SDK-JS)
[![License](https://img.shields.io/npm/l/skygear.svg)](https://www.npmjs.com/package/skygear)

Skygear Server is an opensource serverless backend for making web and mobile app
development faster, delegate the backend to Skygear so you can focus at the
frontend.

You may try the host version at [skygear.io](https://skygear.io) or deploy your
[own server](https://github.com/skygeario/skygear-server).

This repo contains the Skygear JS Client SDK (skygear), and skygear-node which
enable you to write custom Cloud Functions to extend Skygear capability.

Check out the [Quick Start Guide](https://docs.skygear.io/guides/intro/quickstart/js/)
to start using Skygear JS SDK to write your Web / Ionic / React-Native apps.

Besides guides, here is the [API doc](https://docs.skygear.io/js/reference/latest/).

## Installation with npm

Simply install via

```
$ npm install skygear
```

And you can start configure Skygear in your app:

```
var skygear = require('skygear');
#import skygear from 'skygear'; #For ES2015

skygear.config({
    'endPoint': 'https://<your-app-name>.skygeario.com',
    'apiKey': '<your-api-key>',
}).then(() => {
    console.log('Container is ready to make API call');
}, (error) => {
    console.log(error);
});
```

## Installation via CDN

Include the following lines into the header of your HTML file:

```
<!--Skygear CDN-->
<script src="https://code.skygear.io/js/polyfill/latest/polyfill.min.js"></script>
<script src="https://code.skygear.io/js/skygear/latest/skygear.min.js"></script>

<!--Skygear configuration-->
<!--The app end point and the api key can be found in the developer portal-->
<script>
  skygear.config({
    'endPoint': 'https://<your-app-name>.skygeario.com/', // trailing slash is required
    'apiKey': '<your-api-key>',
  }).then(() => {
    console.log('skygear container is now ready for making API calls.');
  }, (error) => {
    console.error(error);
  });
</script>
```

## Running client example

Checkout the source and run the following to launch a local server:

```
npm install

# run example with demo endpoint
npm run example

# run example with your app endpoint
SKYGEAR_ENDPOINT=https://<your-app-name>.skygeario.com SKYGEAR_API_KEY=<your-api-key> npm run example
```

## Development

Check out [DEVELOPMENT.md].

Pull requests are welcomed!

Report bug on https://github.com/SkygearIO/skygear-SDK-JS/issues

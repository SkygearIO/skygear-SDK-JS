![Skygear Logo](.github/skygear-logo.png)
# Skygear SDK for JavaScript

[![npm](https://img.shields.io/npm/v/skygear.svg)](https://www.npmjs.com/package/skygear)
[![Build Status](https://travis-ci.org/SkygearIO/skygear-SDK-JS.svg?branch=master)](https://travis-ci.org/SkygearIO/skygear-SDK-JS)
[![License](https://img.shields.io/npm/l/skygear.svg)](https://www.npmjs.com/package/skygear)

The Skygear JS SDK library that gives you access to the Skygear Server from your JavaScript app.

This library is also compatible with:

- ReactJS
- AngularJS
- Node.js
- Webpack projects


## Getting Started

To get started, you need to have the [Skygear Server](https://github.com/skygearIO/skygear-server) running and JS SDK installed into your app. You can see detailed procedure at the getting started guide at [https://docs.skygear.io/server/guide](https://docs.skygear.io/js/guide).

You can sign up the Skygear Hosting at the Skygear Developer Portal at [https://portal.skygear.io](https://portal.skygear.io)

### For npm project

Skygear JS SDK can be directly used in Node.js environment. Simply install [npm](https://www.npmjs.com/) and require it in your project.

```
npm install skygear --save
```

```
const skygear = require('skygear');
```

For more detail and other installation guides, please refer to our [Get Started Guide](https://docs.skygear.io/js/guide#include-js-sdk) at the Skygear [docs site](https://docs.skygear.io).


## Examples

The example below shows how we can save a `Note` record in the Skygear public database.

```javascript
const Note = skygear.Record.extend('note');
const record = new Note({ content: 'I am a note.' });
skygear.publicDB.save(record).then((record) => {
  console.log(record);
}, (error) => {
  console.error(error);
});

```

Learn more about how to Create, Update, Read and Delete the Records in the [Record](docs.skygear.io/js/guide/record/) section.


## Documentation
The full documentation for Skygear is available on our docs site. The [JavaScript SDK get started guide](https://docs.skygear.io/js/guide) is a good place to get started.


## Support

For implementation related questions or technical support, please refer to the [Stack Overflow](http://stackoverflow.com/questions/tagged/skygear) community.

If you believe you've found an issue with Skygear JavaScript SDK, please feel free to [report an issue](https://github.com/SkygearIO/skygear-SDK-JS/issues).


## How to contribute

Pull Requests Welcome!

We really want to see Skygear grows and thrives in the open source community.
If you have any fixes or suggestions, simply send us a pull request!


## License & Copyright

```
Copyright (c) 2015-present, Oursky Ltd.
All rights reserved.

This source code is licensed under the Apache License version 2.0 
found in the LICENSE file in the root directory of this source tree. 
An additional grant of patent rights can be found in the PATENTS 
file in the same directory.

```

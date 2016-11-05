import path from 'path';

import {
  settings
} from './cloud/settings';


let cmd = 'index.js';
if (process.argv.length > 2) {
  cmd = process.argv[2];
}

if (cmd === '--help') {
  process.stdout.write(`
  Usage: skygear-node <file>

  file will default to index.js if not provided.

  skygear-node are configured by ENVVAR:
  - SKYGEAR_ADDRESS: Binds to this socket for skygear
  - SKYGEAR_ENDPOINT: Send to this addres for skygear handlers
  - API_KEY: API Key of the application [env var: API_KEY]
  - MASTER_KEY: Master Key of the application
  - APP_NAME: Application name of the skygear daemon
  - LOG_LEVEL: Log level
  - HTTP: Trigger http web server
  - HTTP_ADDR: Address where htp web server listen to
  - DEBUG: Enable debugging features
  - SERVE_STATIC_ASSETS: Enable to serve static asset from plugin process
  - PUBSUB_URL: The URL of the pubsub server, should start with ws://
    or wss:// and include the path
  `);

  process.exit();
}

if (cmd === '--settings') {
  console.log(settings);
  process.exit();
}

const codePath = path.join(process.cwd(), cmd);
require(codePath);

let transport;
if (settings.http) {
  transport = require('./cloud/transport/http');
} else {
  throw new Error('Currently, only http transport is supported.');
}

transport.start();

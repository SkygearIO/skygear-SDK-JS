import path from 'path';
import fs from 'fs';
import {ncp} from 'ncp';
import {execSync} from 'child_process';

import {
  settings
} from './cloud/settings';
import registry from './cloud/registry';

let cmd = 'index.js';
if (process.argv.length > 2) {
  cmd = process.argv[2];
}

if (cmd === '--help') {
  process.stdout.write(`
  Usage: skygear-asset <file>

  file will default to index.js if not provided.
  For configuration, please see skygear-node. Which provided details.
  `);

  process.exit();
}

const codePath = path.join(process.cwd(), cmd);
require(codePath);

if (fs.existsSync(settings.collectAsset)) {
  if (!settings.forceAsset) {
    process.stdout.write(`Directory '${settings.collectAsset}' already exists.
Remove the directory first, or specify FORCE_ASSET to discard files
in the directory.
`);
    process.exit();
  }
  execSync('rm -r ' + settings.collectAsset);
  console.log(`Cleaned up ${settings.collectAsset}`);
}

fs.mkdirSync(settings.collectAsset);

Object.keys(registry.staticAsset).forEach(function (key) {
  const src = registry.staticAsset[key]();
  const dest = path.join(settings.collectAsset, key);
  console.log(`Copying ${src} into ${dest}`);
  ncp(src, dest, function (err) {
    if (err) {
      return console.error(err);
    }
    console.log(`Copied ${src} into ${dest}`);
  });
});

// Force the process to exit because we might have imported code
// that queued a callback.
process.exit();

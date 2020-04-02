const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { URL } = require("url");

const express = require("express");
const rimrafSync = require("rimraf").sync;

const SKYGEAR_APP_ENDPOINT =
  process.env.SKYGEAR_APP_ENDPOINT || "http://app.localhost:3000";
const SKYGEAR_AUTH_ENDPOINT =
  process.env.SKYGEAR_AUTH_ENDPOINT || "http://accounts.app.localhost:3000";
const SKYGEAR_ASSET_ENDPOINT =
  process.env.SKYGEAR_ASSET_ENDPOINT || "http://assets.app.localhost:3000";
const SKYGEAR_CLIENT_ID = process.env.SKYGEAR_CLIENT_ID || "api_key";
const SKYGEAR_IS_THIRD_PARTY_APP =
  process.env.SKYGEAR_IS_THIRD_PARTY_APP === "true";
const PORT = parseInt(process.env.PORT || "9999", 10);

const dist = path.join(__dirname, "./dist");
const src = path.join(__dirname, "./src");

function compileFile(basename) {
  const srcPath = path.join(src, basename);
  const distPath = path.join(dist, basename);
  let content = fs.readFileSync(srcPath, { encoding: "utf8" });
  content = content
    .replace(/__SKYGEAR_APP_ENDPOINT__/g, SKYGEAR_APP_ENDPOINT)
    .replace(/__SKYGEAR_AUTH_ENDPOINT__/g, SKYGEAR_AUTH_ENDPOINT)
    .replace(/__SKYGEAR_ASSET_ENDPOINT__/g, SKYGEAR_ASSET_ENDPOINT)
    .replace(/__SKYGEAR_CLIENT_ID__/g, SKYGEAR_CLIENT_ID)
    .replace(/__SKYGEAR_IS_THIRD_PARTY_APP__/g, SKYGEAR_IS_THIRD_PARTY_APP);
  fs.writeFileSync(distPath, content);
}

rimrafSync(dist);
fs.mkdirSync(dist);
for (const basename of fs.readdirSync(src)) {
  compileFile(basename);
}

const watcher = fs.watch(src, (eventType, filename) => {
  if (eventType === "change") {
    compileFile(filename);
    console.log("Recompiled: " + filename);
  }
});

const app = express();
app.use(express.static(path.join(__dirname, "../skygear-web/dist")));
app.use(express.static(path.join(__dirname, "./dist")));
app.listen(PORT, () => {
  const u = new URL(SKYGEAR_APP_ENDPOINT);
  u.port = String(PORT);
  console.log("Configuration:");
  console.log({
    SKYGEAR_APP_ENDPOINT,
    SKYGEAR_AUTH_ENDPOINT,
    SKYGEAR_ASSET_ENDPOINT,
    SKYGEAR_CLIENT_ID,
    SKYGEAR_IS_THIRD_PARTY_APP,
  });
  console.log("Visit " + u.toString() + " to browse examples");
});

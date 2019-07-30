const fs = require("fs");
const path = require("path");
const child_process = require("child_process");

const express = require("express");
const rimrafSync = require("rimraf").sync;

const ENDPOINT = process.env.SKYGEAR_ENDPOINT || "http://localhost:3000";
const API_KEY = process.env.SKYGEAR_API_KEY || "api_key";
const PORT = parseInt(process.env.PORT || "9999", 10);

const dist = path.join(__dirname, "./dist");
const src = path.join(__dirname, "./src");

function compileFile(basename) {
  const srcPath = path.join(src, basename);
  const distPath = path.join(dist, basename);
  let content = fs.readFileSync(srcPath, { encoding: "utf8" });
  content = content
    .replace(/__SKYGEAR_ENDPOINT__/g, ENDPOINT)
    .replace(/__SKYGEAR_API_KEY__/g, API_KEY);
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
app.listen(PORT, () => console.log("Listening on port " + String(PORT)));

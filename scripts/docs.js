const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const dir = "./docs";

function generateDocs() {
  return new Promise((resolve, reject) => {
    exec("api-documenter markdown -i temp -o docs", (err, stdout, stderr) => {
      console.log(stdout);
      console.error(stderr);
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function fixDocs() {
  const filenames = fs.readdirSync(dir);
  for (const filename of filenames) {
    const { name: id, ext } = path.parse(filename);
    if (ext !== ".md") {
      continue;
    }
    const filepath = path.join(dir, filename);
    const lines = fs.readFileSync(filepath, { encoding: "utf8" }).split("\r\n");

    const output = [];
    let title = "";
    for (const line of lines) {
      let skip = false;
      if (!title) {
        const titleLine = line.match(/## (.*)/);
        if (titleLine) {
          title = titleLine[1];
        }
      }
      const homeLink = line.match(/\[Home\]\(.\/index\.md\) &gt; (.*)/);
      if (homeLink) {
        skip = true;
      }
      if (!skip) {
        output.push(line);
      }
    }

    const header = [
      "---",
      `id: ${id}`,
      `title: ${title}`,
      `hide_title: true`,
      "---",
    ];

    fs.writeFileSync(filepath, header.concat(output).join("\n"));
  }
}

function writeIndex() {
  const lines = [
    "---",
    "id: index",
    "title: Index",
    "hide_title: true",
    "---",
    "",
    "- [@skygear/web](./web.md)",
    "- [@skygear/node-client](./node-client.md)",
    "- [@skygear/react-native](./react-native.md)",
    "",
  ];
  fs.writeFileSync(path.join(dir, "./index.md"), lines.join("\n"));
}

async function main() {
  await generateDocs();
  fixDocs();
  writeIndex();
}

main();
